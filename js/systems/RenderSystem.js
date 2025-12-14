// js/systems/RenderSystem.js

import { WEAPON_DB } from "../../config.js";
// ✅ IMPORT NOVO: Importa a biblioteca de efeitos visuais
import { VisualEffects } from "../utils/VisualEffects.js";

export class RenderSystem {
  constructor(mainCanvas, terrainCanvas) {
    this.mainCanvas = mainCanvas;
    this.terrainCanvas = terrainCanvas;
    this.ctx = mainCanvas.getContext("2d");
    this.camera = { x: 0, y: 0 };
    this.lastTime = performance.now();
  }

  update(world) {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // 1. Atualiza câmera (Suavização com Clamp)
    const focusTargets = world.query(["position", "cameraFocus"]);
    if (focusTargets.length > 0) {
      const target = focusTargets[0].components.position;
      const smoothing = 0.1;

      let targetCamX = target.x - this.mainCanvas.width / 2;
      let targetCamY = target.y - this.mainCanvas.height / 2;

      // --- APLICA A TRAVA (CLAMP) ---
      const mapW = this.terrainCanvas.width;
      const mapH = this.terrainCanvas.height;
      const camW = this.mainCanvas.width;
      const camH = this.mainCanvas.height;

      // Trava X
      targetCamX = Math.max(0, Math.min(targetCamX, mapW - camW));

      // Trava Y (-500 permite ver o céu)
      targetCamY = Math.max(-500, Math.min(targetCamY, mapH - camH));

      this.camera.x += (targetCamX - this.camera.x) * smoothing;
      this.camera.y += (targetCamY - this.camera.y) * smoothing;
    }

    // ============================================================
    // 🌍 SISTEMA DE TREMOR OTIMIZADO
    // ============================================================
    let currentShakeIntensity = 0;
    const activeExplosions = world.query(["explosion", "renderable"]);

    activeExplosions.forEach((ent) => {
      const rend = ent.components.renderable;
      const anim = rend.animation;

      if (anim) {
        const totalFrames =
          (anim.spriteSheet && anim.spriteSheet.totalFrames) ||
          anim.totalFrames ||
          10;
        const progress = anim.currentFrame / totalFrames;
        const decay = Math.max(0, 1 - progress);
        const baseForce = 20 * (rend.scale || 1.0);

        currentShakeIntensity = Math.max(
          currentShakeIntensity,
          baseForce * decay
        );
      }
    });

    let shakeX = 0;
    let shakeY = 0;

    if (currentShakeIntensity > 0.5) {
      shakeX = (Math.random() - 0.5) * currentShakeIntensity;
      shakeY = (Math.random() - 0.5) * currentShakeIntensity;
    }

    // ============================================================
    // 🖌️ DESENHO (RENDER)
    // ============================================================

    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.ctx.save();

    // Aplica Câmera + Tremor
    this.ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

    // 2. Desenha terreno
    this.ctx.drawImage(this.terrainCanvas, 0, 0);

    // 3. Organiza entidades
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

    // 4. Desenha TANKS
    tanks.forEach((ent) => {
      const pos = ent.components.position;
      const rend = ent.components.renderable;
      const ctrl = ent.components.playerControl;

      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);

      if (ctrl) {
        const weaponStats = WEAPON_DB[ctrl.weaponId];
        if (weaponStats && weaponStats.weaponSprite) {
          this.drawWeaponBackpack(weaponStats.weaponSprite, ctrl.facingRight);
        }
      }

      this.ctx.fillStyle = rend.color;
      if (ctrl && !ctrl.facingRight) {
        this.ctx.scale(-1, 1);
      }

      this.ctx.fillRect(-10, -15, 20, 15);
      this.ctx.fillStyle = "blue";
      this.ctx.fillRect(-2, 0, 4, 4);

      if (ctrl) {
        this.drawAim(ctrl, ctrl.facingRight);
      }

      this.ctx.restore();
    });

    // 5. Desenha PROJÉTEIS
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
          if (bomb) {
            const angle = Math.atan2(bomb.vY, bomb.vX);
            this.ctx.rotate(angle);
          }

          const scale = rend.scale || 1.0;
          const drawWidth = frameData.sw * scale;
          const drawHeight = frameData.sh * scale;

          this.ctx.drawImage(
            frameData.image,
            frameData.sx,
            frameData.sy,
            frameData.sw,
            frameData.sh,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
          );
        }
      } else if (rend.type === "projectile") {
        this.ctx.fillStyle = rend.color;
        this.ctx.fillRect(-rend.size / 2, -rend.size / 2, rend.size, rend.size);

        this.ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
        this.ctx.fillRect(
          -rend.size / 2 - 2,
          -rend.size / 2 - 2,
          rend.size + 4,
          rend.size + 4
        );
      }

      this.ctx.restore();
    });

    // 6. Desenha EXPLOSÕES (COM VISUAL EFFECTS MODULAR)
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
          const totalFrames = animation.spriteSheet.totalFrames;
          const currentFrame = animation.currentFrame;
          const progress = currentFrame / totalFrames; // 0.0 a 1.0
          const scale = rend.scale || 1.0;

          // ===========================================
          // 🎨 USANDO A CLASSE VISUAL EFFECTS
          // ===========================================

          // 1. Calcula escala elástica
          const dynamicScale = VisualEffects.getElasticScale(scale, progress);

          // 2. Aplica Fade Out (mexe no globalAlpha)
          VisualEffects.applyFadeOut(this.ctx, progress);

          // 3. Aplica Neon/Tremor (mexe no composite e rotate)
          VisualEffects.applyNeonGlow(
            this.ctx,
            animation.spriteSheet.image.src
          );

          // ===========================================

          const drawWidth = frameData.sw * dynamicScale;
          const drawHeight = frameData.sh * dynamicScale;

          // Centralização e Offset
          let drawX = -drawWidth / 2;
          let drawY = -drawHeight / 2;

          if (rend.offsetX) drawX += rend.offsetX * dynamicScale;
          if (rend.offsetY) drawY += rend.offsetY * dynamicScale;

          this.ctx.drawImage(
            frameData.image,
            frameData.sx,
            frameData.sy,
            frameData.sw,
            frameData.sh,
            drawX,
            drawY,
            drawWidth,
            drawHeight
          );
        }
      }

      this.ctx.restore();
    });

    this.ctx.restore();

    // 7. HUD e Debug
    const players = world.query(["playerControl"]);
    if (players.length > 0) {
      this.drawHUD(players[0].components.playerControl);
    }

    this.updateDebugPanel(world);
  }

  drawWeaponBackpack(weaponSprite, facingRight) {
    if (!weaponSprite.loaded && !weaponSprite.loading) {
      weaponSprite.loading = true;
      const img = new Image();
      img.onload = () => {
        weaponSprite.image = img;
        weaponSprite.loaded = true;
        weaponSprite.loading = false;
      };
      img.onerror = () => {
        console.error(`❌ Erro ao carregar arma: ${weaponSprite.path}`);
        weaponSprite.loading = false;
      };
      img.src = weaponSprite.path;
      return;
    }

    if (!weaponSprite.loaded || !weaponSprite.image) return;

    const img = weaponSprite.image;
    const scale = weaponSprite.scale || 1.0;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    let offsetX = weaponSprite.offsetX;
    if (!facingRight) {
      offsetX = -offsetX;
    }

    this.ctx.drawImage(
      img,
      offsetX - drawWidth / 2,
      weaponSprite.offsetY - drawHeight / 2,
      drawWidth,
      drawHeight
    );
  }

  drawAim(ctrl, facingRight = true) {
    const rad = (ctrl.angle * Math.PI) / 180;
    const finalAngle = facingRight ? rad : Math.PI - rad;

    this.ctx.strokeStyle = ctrl.isCharging ? "red" : "rgba(255,255,255,0.5)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -10);
    this.ctx.lineTo(Math.cos(finalAngle) * 40, -10 - Math.sin(finalAngle) * 40);
    this.ctx.stroke();
  }

  drawHUD(ctrl) {
    const powerBar = document.getElementById("power-fill");
    const powerText = document.getElementById("power-text");

    if (powerBar && powerText) {
      const visualPower = Math.min(ctrl.power, 100);
      powerBar.style.width = `${visualPower}%`;
      powerText.innerText = Math.floor(visualPower);

      const angleNeedle = document.getElementById("angle-needle");
      const angleText = document.getElementById("angle-text");

      if (angleNeedle && angleText) {
        angleText.innerText = Math.floor(ctrl.angle);
        const rotation = 90 - ctrl.angle;
        angleNeedle.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`;
      }
    }

    this.ctx.fillStyle = "white";
    this.ctx.font = "16px sans-serif";
    this.ctx.fillText(`Arma: ${WEAPON_DB[ctrl.weaponId].name}`, 20, 30);
    this.ctx.fillText(`Ângulo: ${ctrl.angle}°`, 20, 50);
  }

  updateDebugPanel(world) {
    const projectiles = world.query(["bombComponent"]);
    const players = world.query(["position", "body"]);

    let html = `
      <div>Entidades: ${world.entities.length}</div>
      <div>Projéteis: ${projectiles.length}</div>
      <div style="margin-top: 5px; border-top: 1px solid #666; padding-top: 5px;">
        <div>📷 Câmera:</div>
        <div>X: ${Math.floor(this.camera.x)}</div>
        <div>Y: ${Math.floor(this.camera.y)}</div>
      </div>
    `;

    if (projectiles.length > 0) {
      const bomb = projectiles[0].components.bombComponent.instance;
      html += `
        <div style="margin-top: 5px; border-top: 1px solid #666; padding-top: 5px;">
          <div>🚀 Projétil:</div>
          <div>Pos: (${Math.floor(bomb.x)}, ${Math.floor(bomb.y)})</div>
          <div>Vel: (${bomb.vX.toFixed(1)}, ${bomb.vY.toFixed(1)})</div>
        </div>
      `;
    }

    if (players.length > 0) {
      const pos = players[0].components.position;
      const body = players[0].components.body;
      html += `
        <div style="margin-top: 5px; border-top: 1px solid #666; padding-top: 5px;">
          <div>🎮 Player:</div>
          <div>Pos: (${Math.floor(pos.x)}, ${Math.floor(pos.y)})</div>
          <div>Chão: ${body.isGrounded ? "✅" : "❌"}</div>
        </div>
      `;
    }

    document.getElementById("debug-content").innerHTML = html;
  }
}
