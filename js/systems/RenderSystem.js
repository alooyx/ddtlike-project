// js/systems/RenderSystem.js

import { WEAPON_DB } from "../../config.js";
import { VisualEffects } from "../utils/VisualEffects.js";

export class RenderSystem {
  constructor(mainCanvas, terrainCanvas, cameraState) {
    this.mainCanvas = mainCanvas;
    this.terrainCanvas = terrainCanvas;
    this.ctx = mainCanvas.getContext("2d");
    this.camera = cameraState;
    this.lastTime = performance.now();
  }

  update(world) {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // 1. Limpa e Prepara
    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.ctx.save();

    // 2. Aplica Câmera
    this.ctx.translate(
      -this.camera.x + this.camera.shakeX,
      -this.camera.y + this.camera.shakeY
    );

    // 3. Desenha Mundo
    this.ctx.drawImage(this.terrainCanvas, 0, 0);

    // 4. Organiza Entidades
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

    // 5. Desenha TANKS
    tanks.forEach((ent) => {
      const pos = ent.components.position;
      const rend = ent.components.renderable;
      const ctrl = ent.components.playerControl;

      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);

      // --- A. ROTAÇÃO DO TERRENO ---
      if (ent.components.body) {
        let visualRot = ent.components.body.rotation;
        if (ctrl && !ctrl.facingRight) visualRot = -visualRot;
        this.ctx.rotate(visualRot);
      }

      // --- B. ESPELHAMENTO ---
      if (ctrl && !ctrl.facingRight) {
        this.ctx.scale(-1, 1);
      }

      // --- C. DESENHA O CORPO ---
      this.ctx.fillStyle = rend.color;
      this.ctx.fillRect(-10, -15, 20, 15);
      this.ctx.fillStyle = "blue";
      this.ctx.fillRect(-2, 0, 4, 4);

      // --- D. DESENHA A ARMA (TRAVADA) ---
      if (ctrl) {
        const weaponStats = WEAPON_DB[ctrl.weaponId];
        if (weaponStats && weaponStats.weaponSprite) {
          this.drawWeaponBackpack(weaponStats.weaponSprite, ctrl.angle);
        }
      }

      // --- E. DESENHA A MIRA ---
      if (ctrl) {
        this.drawAim(ctrl);
      }

      this.ctx.restore();
    });

    // 6. Desenha PROJÉTEIS
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

    // 7. Desenha EXPLOSÕES
    explosions.forEach((ent) => {
      const pos = ent.components.position;
      const rend = ent.components.renderable;
      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);
      if (rend.type === "sprite") {
        const animation = rend.animation;
        animation.update(deltaTime);
        const frameData = animation.getCurrentFrame();
        if (frameData) {
          const progress =
            animation.currentFrame / animation.spriteSheet.totalFrames;
          const scale = rend.scale || 1.0;
          const dynamicScale = VisualEffects.getElasticScale(scale, progress);
          VisualEffects.applyFadeOut(this.ctx, progress);
          VisualEffects.applyNeonGlow(
            this.ctx,
            animation.spriteSheet.image.src
          );
          const dW = frameData.sw * dynamicScale;
          const dH = frameData.sh * dynamicScale;
          let dX = -dW / 2;
          let dY = -dH / 2;
          if (rend.offsetX) dX += rend.offsetX * dynamicScale;
          if (rend.offsetY) dY += rend.offsetY * dynamicScale;
          this.ctx.drawImage(
            frameData.image,
            frameData.sx,
            frameData.sy,
            frameData.sw,
            frameData.sh,
            dX,
            dY,
            dW,
            dH
          );
        }
      }
      this.ctx.restore();
    });

    this.ctx.restore();

    // 8. HUD
    this.drawUI(world);
  }

  // =========================================================================
  // 🖥️ UI / HUD / HELPERS
  // =========================================================================

  drawUI(world) {
    const players = world.query(["playerControl"]);
    if (players.length > 0) {
      const ctrl = players[0].components.playerControl;
      const body = players[0].components.body;
      this.updateHUD(ctrl, body);
    }
    this.updateDebugPanel(world);
  }

  updateHUD(ctrl, body) {
    const baseAngle = ctrl.angle || 0;

    // Cálculo da inclinação do terreno
    const rawRotation = body && body.rotation ? body.rotation : 0;
    let terrainAngle = -((rawRotation * 180) / Math.PI);

    // Se olhar para a esquerda, a inclinação inverte matematicamente
    if (!ctrl.facingRight) {
      terrainAngle = -terrainAngle;
    }

    const trueAngle = Math.floor(baseAngle + terrainAngle);

    // Barras de Força
    const powerBar = document.getElementById("power-fill");
    const powerText = document.getElementById("power-text");
    if (powerBar && powerText) {
      const visualPower = Math.min(ctrl.power, 100);
      powerBar.style.width = `${visualPower}%`;
      powerText.innerText = Math.floor(visualPower);
    }

    // ============================================================
    // 🧭 AGULHA COM TELEPORTE NA VIRADA
    // ============================================================
    const angleNeedle = document.getElementById("angle-needle");
    const angleText = document.getElementById("angle-text");

    if (angleNeedle && angleText) {
      angleText.innerText = trueAngle;

      // 1. Calcula a Rotação do Ponteiro
      let rotation;
      if (ctrl.facingRight) {
        rotation = 90 - trueAngle; // Direita (0=3h, 90=12h)
      } else {
        rotation = -90 + trueAngle; // Esquerda (0=9h, 90=12h)
      }

      // 2. LÓGICA DO TELEPORTE (SNAP)
      // Verifica se o lado mudou desde o último frame
      if (this.lastFacingRight !== ctrl.facingRight) {
        // SE MUDOU DE LADO:
        // Desliga a animação imediatamente para "teleportar"
        angleNeedle.style.transition = "none";
      } else {
        // SE É O MESMO LADO (Movimento normal do ângulo):
        // Mantém suave (supondo que você queira suavidade ao mirar)
        angleNeedle.style.transition = "transform 0.1s linear";
      }

      // 3. Aplica a transformação
      angleNeedle.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`;

      // 4. Atualiza o estado para o próximo frame
      this.lastFacingRight = ctrl.facingRight;
    }

    // Texto de Debug
    this.ctx.fillStyle = "white";
    this.ctx.font = "16px sans-serif";
    this.ctx.fillText(`Arma: ${WEAPON_DB[ctrl.weaponId].name}`, 20, 30);
    this.ctx.fillText(`Ângulo: ${trueAngle}°`, 20, 50);
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

    // =================================================================
    // 🔒 ARMA TRAVADA (Lock Weapon) - Comentado para travar visualmente
    // =================================================================
    // const rad = (angle * Math.PI) / 180;
    // this.ctx.rotate(-rad);
    // =================================================================

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
    if (document.getElementById("debug-content")) {
      document.getElementById(
        "debug-content"
      ).innerHTML = `Entidades: ${world.entities.length} | Projéteis: ${projectiles.length}`;
    }
  }
}
