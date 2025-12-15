// js/systems/RenderSystem.js

import { WEAPON_DB } from "../../config.js";
import { VisualEffects } from "../utils/VisualEffects.js";

export class RenderSystem {
  constructor(mainCanvas, terrainCanvas, cameraState, bgImage, ruleImage) {
    this.mainCanvas = mainCanvas;
    this.terrainCanvas = terrainCanvas;
    this.ctx = mainCanvas.getContext("2d");
    this.camera = cameraState;
    this.lastTime = performance.now();
    this.bgImage = bgImage;
    this.ruleImage = ruleImage;
  }

  update(world) {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // 1. Clear Screen
    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

    // 2. Draw Background (Parallax)
    if (this.bgImage) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.8; // Transparency for background

      const parallaxSpeed = 0.3;
      const bgW = this.bgImage.width;
      // Handle infinite scrolling correctly even if x is negative
      const offsetX = (Math.abs(this.camera.x) * parallaxSpeed) % bgW;

      // Image 1
      this.ctx.drawImage(
        this.bgImage,
        -offsetX,
        0,
        bgW,
        this.mainCanvas.height
      );

      // Image 2 (Fill the gap)
      if (offsetX > 0) {
        this.ctx.drawImage(
          this.bgImage,
          bgW - offsetX,
          0,
          bgW,
          this.mainCanvas.height
        );
      }
      this.ctx.restore();
    }

    this.ctx.save();

    // 3. Apply Camera
    this.ctx.translate(
      -this.camera.x + this.camera.shakeX,
      -this.camera.y + this.camera.shakeY
    );

    // 4. Draw Terrain
    this.ctx.drawImage(this.terrainCanvas, 0, 0);

    // 5. Organize Entities
    const renderables = world.query(["position", "renderable"]);
    const tanks = [];
    const projectiles = [];
    const explosions = [];

    renderables.forEach((ent) => {
      const rend = ent.components.renderable;
      if (ent.components.explosion) {
        explosions.push(ent);
      } else if (rend.type === "sprite" || rend.type === "projectile") {
        projectiles.push(ent);
      } else {
        tanks.push(ent);
      }
    });

    // 6. Draw Characters (Tanks)
    tanks.forEach((ent) => {
      const pos = ent.components.position;
      const rend = ent.components.renderable;
      const ctrl = ent.components.playerControl;

      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);

      // --- Rotation & Mirroring ---
      if (ent.components.body) {
        let visualRot = ent.components.body.rotation;
        if (ctrl && !ctrl.facingRight) visualRot = -visualRot;
        this.ctx.rotate(visualRot);
      }

      if (ctrl && !ctrl.facingRight) {
        this.ctx.scale(-1, 1);
      }

      // --- DRAW BODY ---
      if (rend.type === "character") {
        // [A] Character Sprite
        if (rend.animation) {
          rend.animation.update(deltaTime);
          const frame = rend.animation.getCurrentFrame();

          if (frame && frame.image) {
            const scale = rend.scale || 1.0;
            const w = frame.sw * scale;
            const h = frame.sh * scale;
            const offY = rend.offsetY || 0;

            this.ctx.drawImage(
              frame.image,
              frame.sx,
              frame.sy,
              frame.sw,
              frame.sh,
              -w / 2,
              -h + 15 + offY,
              w,
              h
            );
          } else {
            // Error Box
            this.ctx.fillStyle = "magenta";
            this.ctx.fillRect(-10, -20, 20, 40);
          }
        }
      } else {
        // [B] Fallback Box (Restored this safety check!)
        this.ctx.fillStyle = rend.color || "green";
        this.ctx.fillRect(-10, -15, 20, 15);
        this.ctx.fillStyle = "blue";
        this.ctx.fillRect(-2, 0, 4, 4);
      }

      // --- Weapon & Aim ---
      if (ctrl) {
        const weaponStats = WEAPON_DB[ctrl.weaponId];
        if (weaponStats && weaponStats.weaponSprite) {
          this.drawWeaponBackpack(weaponStats.weaponSprite, ctrl.angle);
        }
        this.drawAim(ctrl);
      }

      this.ctx.restore();
    });

    // 7. Draw Projectiles
    projectiles.forEach((ent) => {
      const pos = ent.components.position;
      const rend = ent.components.renderable;
      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);

      if (rend.type === "sprite") {
        const animation = rend.animation;
        animation.update(deltaTime);
        const frameData = animation.getCurrentFrame();
        if (frameData) {
          const bomb = ent.components.bombComponent?.instance;
          if (bomb) this.ctx.rotate(Math.atan2(bomb.vY, bomb.vX));
          const scale = rend.scale || 1.0;
          this.ctx.drawImage(
            frameData.image,
            frameData.sx,
            frameData.sy,
            frameData.sw,
            frameData.sh,
            (-frameData.sw * scale) / 2,
            (-frameData.sh * scale) / 2,
            frameData.sw * scale,
            frameData.sh * scale
          );
        }
      } else {
        this.ctx.fillStyle = rend.color;
        this.ctx.fillRect(-rend.size / 2, -rend.size / 2, rend.size, rend.size);
      }
      this.ctx.restore();
    });

    // 8. Draw Explosions
    explosions.forEach((ent) => {
      // (Keep your existing explosion code here)
      const pos = ent.components.position;
      const rend = ent.components.renderable;
      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);
      if (rend.type === "sprite" && rend.animation) {
        rend.animation.update(deltaTime);
        const frame = rend.animation.getCurrentFrame();
        if (frame) {
          const progress =
            rend.animation.currentFrame /
            rend.animation.spriteSheet.totalFrames;
          const scale = rend.scale || 1.0;
          const dynamicScale = VisualEffects.getElasticScale(scale, progress);
          VisualEffects.applyFadeOut(this.ctx, progress);
          VisualEffects.applyNeonGlow(
            this.ctx,
            rend.animation.spriteSheet.image.src
          );

          const w = frame.sw * dynamicScale;
          const h = frame.sh * dynamicScale;
          this.ctx.drawImage(
            frame.image,
            frame.sx,
            frame.sy,
            frame.sw,
            frame.sh,
            -w / 2,
            -h / 2,
            w,
            h
          );
        }
      }
      this.ctx.restore();
    });

    this.ctx.restore();

    // 9. Draw UI
    this.drawUI(world);
  }

  // =========================================================================
  // 🖥️ UI (Performance Optimized)
  // =========================================================================

  drawUI(world) {
    const players = world.query(["playerControl"]);
    if (players.length === 0) return;

    const ctrl = players[0].components.playerControl;

    // --- 📏 BARRA DE FORÇA (CANVAS) ---
    if (this.ruleImage) {
      // 1. Configuração de Tamanho
      // A régua vai ter 800px de largura na tela (pode diminuir se ficar muito grande)
      const ruleW = 700;
      const scale = ruleW / this.ruleImage.width;
      const ruleH = this.ruleImage.height * scale;

      // Posição: Centralizado embaixo
      const x = (this.mainCanvas.width - ruleW) / 2;
      const y = this.mainCanvas.height - ruleH - 10; // 10px do fundo

      // 2. Desenha a Imagem da Régua (Fundo)
      this.ctx.drawImage(this.ruleImage, x, y, ruleW, ruleH);

      // 3. Desenha a Barra Colorida (Preenchimento)
      // === CALIBRAGEM FINA PARA O SEU "rule.jpg" ===
      // Baseado na imagem: O slot escuro começa perto do 0 e vai até o 100
      const barX = x + ruleW * 0.03; // 12.8% da esquerda (ajuste do "0")
      const barY = y + ruleH * 0.316; // 36% do topo (altura do slot)
      const maxBarW = ruleW * 0.938; // 79.5% de largura (distância do 0 ao 100)
      const barH = ruleH * 0.55; // 28% de altura (grossura do slot)

      // Calcula largura atual baseada na força (0 a 100)
      const currentBarW = (ctrl.power / 100) * maxBarW;

      if (currentBarW > 0) {
        // Criar Gradiente (Amarelo -> Laranja -> Vermelho)
        const grad = this.ctx.createLinearGradient(barX, 0, barX + maxBarW, 0);
        grad.addColorStop(0, "#ffeb3b"); // Amarelo
        grad.addColorStop(0.6, "#ff9800"); // Laranja
        grad.addColorStop(1, "#ff5722"); // Vermelho

        this.ctx.fillStyle = grad;

        // Desenha a barra
        this.ctx.fillRect(barX, barY, currentBarW, barH);

        // (Opcional) Efeito de Brilho/Neon
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "#ff5722";
        this.ctx.fillRect(barX, barY, currentBarW, barH);
        this.ctx.shadowBlur = 0; // Resetar para não bugar o resto
      }

      // === DEBUG: DESCOMENTE PARA VER A ÁREA DE PREENCHIMENTO ===
      // Se a barra estiver torta, ative isso para ver o retângulo verde de guia
      //this.ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      //this.ctx.fillRect(barX, barY, maxBarW, barH);
      // ==========================================================

      // 4. Desenha o Número da Força
      // Coloca o número flutuando acima da régua, alinhado com a força atual
      this.ctx.fillStyle = "white";
      this.ctx.font = "bold 22px Arial";
      this.ctx.shadowColor = "black";
      this.ctx.shadowBlur = 4;
      this.ctx.textAlign = "center";

      // O número segue a ponta da barra (estilo DDTank)
      // Se a força for 0, fica no inicio. Se for 100, fica no fim.
      const numberX = barX + currentBarW;
      this.ctx.fillText(Math.floor(ctrl.power), numberX, y + 15); // y+15 coloca logo acima da barra

      this.ctx.shadowBlur = 0;
      this.ctx.textAlign = "left"; // Reset
    }

    // Atualiza Ângulo e Debug
    this.updateAngleUI(ctrl, players[0].components.body);
    this.updateDebugPanel(world);
  }

  updateAngleUI(ctrl, body) {
    const angleNeedle = document.getElementById("angle-needle");
    const angleText = document.getElementById("angle-text");
    if (angleNeedle && angleText) {
      const rawRotation = body && body.rotation ? body.rotation : 0;
      let terrainAngle = -((rawRotation * 180) / Math.PI);
      if (!ctrl.facingRight) terrainAngle = -terrainAngle;

      const trueAngle = Math.floor(ctrl.angle + terrainAngle);
      angleText.innerText = trueAngle;

      let rotation = ctrl.facingRight ? 90 - trueAngle : -90 + trueAngle;
      angleNeedle.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`;
    }
  }

  drawWeaponBackpack(weaponSprite, angle = 0) {
    if (!weaponSprite.loaded && !weaponSprite.loading) {
      weaponSprite.loading = true;
      const img = new Image();
      img.onload = () => {
        weaponSprite.image = img;
        weaponSprite.loaded = true;
        weaponSprite.loading = false;
      };
      img.src = weaponSprite.path;
      return;
    }
    if (!weaponSprite.loaded || !weaponSprite.image) return;

    const scale = weaponSprite.scale || 1.0;
    const w = weaponSprite.image.width * scale;
    const h = weaponSprite.image.height * scale;
    const offsetX = weaponSprite.offsetX;
    const offsetY = weaponSprite.offsetY;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    this.ctx.drawImage(weaponSprite.image, -w / 2, -h / 2, w, h);
    this.ctx.restore();
  }

  drawAim(ctrl) {
    const rad = (ctrl.angle * Math.PI) / 180;
    this.ctx.strokeStyle = ctrl.isCharging ? "red" : "rgba(255,255,255,0.5)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -10);
    this.ctx.lineTo(Math.cos(rad) * 40, -10 - Math.sin(rad) * 40);
    this.ctx.stroke();
  }

  updateDebugPanel(world) {
    const projectiles = world.query(["bombComponent"]);
    const debugEl = document.getElementById("debug-content");
    if (debugEl) {
      debugEl.innerHTML = `Entidades: ${world.entities.length} | Projéteis: ${projectiles.length}`;
    }
  }
}
