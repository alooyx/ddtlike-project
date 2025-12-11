import { WEAPON_DB } from "../../config.js";

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

    // Atualiza câmera
    const focusTargets = world.query(["position", "cameraFocus"]);
    if (focusTargets.length > 0) {
      const target = focusTargets[0].components.position;
      const smoothing = 0.15;

      this.camera.x +=
        (target.x - this.mainCanvas.width / 2 - this.camera.x) * smoothing;
      this.camera.y +=
        (target.y - this.mainCanvas.height / 2 - this.camera.y) * smoothing;
    }

    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.ctx.save();

    // Aplica câmera
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Desenha terreno
    this.ctx.drawImage(this.terrainCanvas, 0, 0);

    // 2. Desenha entidades (ordem correta)
    const renderables = world.query(["position", "renderable"]);

    const tanks = [];
    const projectiles = [];
    const explosions = []; // 💥 ARRAY DE EXPLOSÕES

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

    // Desenha tanks (com arma atrás)
    tanks.forEach((ent) => {
      const pos = ent.components.position;
      const rend = ent.components.renderable;
      const ctrl = ent.components.playerControl;

      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);

      // 1. Arma primeiro
      if (ctrl) {
        const weaponStats = WEAPON_DB[ctrl.weaponId];
        if (weaponStats && weaponStats.weaponSprite) {
          this.drawWeaponBackpack(weaponStats.weaponSprite, ctrl.facingRight);
        }
      }

      // 2. Corpo
      this.ctx.fillStyle = rend.color;

      if (ctrl && !ctrl.facingRight) {
        this.ctx.scale(-1, 1);
      }

      this.ctx.fillRect(-10, -15, 20, 15);
      this.ctx.fillStyle = "blue";
      this.ctx.fillRect(-2, 0, 4, 4);

      // 3. Mira
      if (ctrl) {
        this.drawAim(ctrl, ctrl.facingRight);
      }

      this.ctx.restore();
    });

    // Desenha projéteis
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

    // 💥 CORREÇÃO AQUI: LOOP DE EXPLOSÕES
    explosions.forEach((ent) => {
      const pos = ent.components.position;
      const rend = ent.components.renderable;

      // USE "this.ctx" EM VEZ DE "ctx"
      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);

      if (rend.type === "sprite") {
        const animation = rend.animation;
        animation.update(deltaTime);

        const frameData = animation.getCurrentFrame();

        if (frameData) {
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
      }

      this.ctx.restore();
    });

    this.ctx.restore();

    // HUD fixo
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
    this.ctx.fillStyle = "white";
    this.ctx.font = "16px sans-serif";
    this.ctx.fillText(`Arma: ${WEAPON_DB[ctrl.weaponId].name}`, 20, 30);
    this.ctx.fillText(`Força: ${Math.floor(ctrl.power)}`, 20, 50);
    this.ctx.fillText(`Ângulo: ${ctrl.angle}°`, 20, 70);
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
