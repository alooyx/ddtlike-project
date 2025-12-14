// systems/InputSystem.js

import { GAME_STATE, CONFIG, WEAPON_DB } from "../../config.js";
import { BombObject } from "../../Phy/Object/BombObject.js";
import {
  Position,
  SpriteRenderable,
  Renderable,
  BombComponent,
  CameraFocus,
} from "../../components.js";
import { SpriteAnimation } from "../SpriteManager.js";

export class InputSystem {
  constructor(gameMap, spriteManager) {
    this.gameMap = gameMap;
    this.spriteManager = spriteManager;
    this.keys = {};
    this.fireReleased = false;

    window.addEventListener("keydown", (e) => (this.keys[e.code] = true));
    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      if (e.code === "Space") this.fireReleased = true;
    });
  }

  update(world) {
    if (GAME_STATE.turn !== "player") return;

    const players = world.query(["playerControl", "position"]);

    players.forEach((ent) => {
      const ctrl = ent.components.playerControl;
      const pos = ent.components.position;

      // 1. Inicializa o "Acumulador" (Virtual) se não existir
      // Isso permite guardar o 90.5 sem sujar o angulo real
      if (ctrl.virtualAngle === undefined) ctrl.virtualAngle = ctrl.angle;

      // ============================================================
      // ⚙️ SENSIBILIDADE
      // ============================================================
      // Agora você pode controlar isso no config.js (Ex: 0.1 ou 0.2)
      const ANGLE_STEP = CONFIG.angleStep || 1;

      const POWER_SPEED = 0.2;
      const MOVE_SPEED = CONFIG.moveSpeed || 1.5;

      // Movimento
      if (this.keys["ArrowLeft"]) {
        pos.x -= MOVE_SPEED;
        ctrl.facingRight = false;
      }
      if (this.keys["ArrowRight"]) {
        pos.x += MOVE_SPEED;
        ctrl.facingRight = true;
      }

      // ============================================================
      // 📐 ÂNGULO: ACUMULADOR DECIMAL -> SAÍDA INTEIRA
      // ============================================================
      let changed = false;

      if (this.keys["ArrowUp"]) {
        ctrl.virtualAngle += ANGLE_STEP; // Acumula (Ex: 45.1, 45.2...)
        changed = true;

        // Loop de 360 no virtual
        if (ctrl.virtualAngle >= 360) ctrl.virtualAngle = 0;
      }

      if (this.keys["ArrowDown"]) {
        ctrl.virtualAngle -= ANGLE_STEP; // Acumula
        changed = true;

        // Loop reverso
        if (ctrl.virtualAngle < 0) ctrl.virtualAngle = 359.9;
      }

      if (changed) {
        // 🔒 A TRAVA DE OURO: Math.floor
        // Joga fora qualquer decimal. 45.9 vira 45.
        // O jogo SÓ muda de ângulo quando completa 1 grau inteiro.
        ctrl.angle = Math.floor(ctrl.virtualAngle);
      }

      // Força
      if (this.keys["Space"]) {
        ctrl.isCharging = true;
        if (ctrl.power < 0) ctrl.power = 0;
        ctrl.power = Math.min(100, ctrl.power + POWER_SPEED);
      } else {
        if (this.fireReleased && ctrl.power > 0) {
          this.spawnProjectile(world, ent);
          ctrl.power = 0;
          ctrl.isCharging = false;
          this.fireReleased = false;
        } else {
          if (!ctrl.isCharging) ctrl.power = 0;
        }
      }
    });
  }

  spawnProjectile(world, player) {
    console.log("\n🚀 === SPAWN PROJECTILE ===");

    GAME_STATE.turn = "bullet";
    const pos = player.components.position;
    const ctrl = player.components.playerControl;
    const weaponStats = WEAPON_DB[ctrl.weaponId];

    // Garantia final: Ângulo é INTEIRO
    const finalAngle = Math.floor(ctrl.angle);

    console.log(`📊 Arma: ${weaponStats.name}`);
    console.log(`📊 Ângulo: ${finalAngle}°`);
    console.log(`📊 Força: ${Math.floor(ctrl.power)}`);

    if (player.components.cameraFocus) {
      delete player.components.cameraFocus;
    }

    const bullet = world.createEntity();

    // 2. FÍSICA: Agora lê do CONFIG para ficar igual ao seu balanço
    const bomb = new BombObject(
      Date.now(),
      weaponStats.mass || 1,
      CONFIG.GRAVITY || 1, // <--- ÚNICA MUDANÇA AQUI: Lê do config
      0, // Vento
      0, // Ar
      weaponStats.projSize || 10,
      weaponStats.projSize || 10
    );

    bomb.setMap(this.gameMap);

    const cannonLength = 30;
    const pivotX = pos.x;
    const pivotY = pos.y - 15;

    let fireAngle = finalAngle;
    if (!ctrl.facingRight) {
      fireAngle = 180 - finalAngle;
    }

    const rad = (fireAngle * Math.PI) / 180;

    const startX = pivotX + Math.cos(rad) * cannonLength;
    const startY = pivotY - Math.sin(rad) * cannonLength;

    bomb.setXY(startX, startY);

    const powerPercent = ctrl.power / 100;
    const speedMagnitude = powerPercent * weaponStats.speedMult;

    const vx = Math.cos(rad) * speedMagnitude;
    const vy = -Math.sin(rad) * speedMagnitude;

    bomb.setSpeedXY(vx, vy);

    world.addComponent(bullet, "bombComponent", {
      instance: bomb,
      impactId: weaponStats.impactId,
      originX: startX,
      originY: startY,
    });

    world.addComponent(bullet, "position", Position(startX, startY));

    if (weaponStats.spriteId && weaponStats.sprite) {
      const spriteSheet = this.spriteManager.get(weaponStats.spriteId);
      if (spriteSheet && spriteSheet.loaded) {
        const animation = new SpriteAnimation(spriteSheet, true);
        world.addComponent(
          bullet,
          "renderable",
          SpriteRenderable(animation, weaponStats.sprite.scale || 1.0)
        );
      } else {
        world.addComponent(
          bullet,
          "renderable",
          Renderable("projectile", weaponStats.color || "red", 5)
        );
      }
    } else {
      world.addComponent(
        bullet,
        "renderable",
        Renderable("projectile", weaponStats.color || "red", 5)
      );
    }

    world.addComponent(bullet, "cameraFocus", CameraFocus());

    console.log("✅ Projétil disparado!\n");
  }
}
