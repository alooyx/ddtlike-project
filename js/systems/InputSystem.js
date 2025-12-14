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

      // ============================================================
      // ⚙️ SENSIBILIDADE
      // ============================================================
      const ANGLE_STEP = 0.5; // Passo de 1 em 1 grau (INTEIRO)
      const POWER_SPEED = 0.4;
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
      // 📐 ÂNGULO BLINDADO (INTEIROS APENAS)
      // ============================================================
      if (this.keys["ArrowUp"]) {
        ctrl.angle += ANGLE_STEP;

        // 🔒 A TRAVA DE SEGURANÇA:
        // Arredonda IMEDIATAMENTE. Se for 90.5, vira 91. Se for 90.1, vira 90.
        ctrl.angle = Math.round(ctrl.angle);

        // Loop de 360
        if (ctrl.angle >= 360) ctrl.angle = 0;
      }

      if (this.keys["ArrowDown"]) {
        ctrl.angle -= ANGLE_STEP;

        // 🔒 A TRAVA DE SEGURANÇA:
        ctrl.angle = Math.round(ctrl.angle);

        // Loop reverso
        if (ctrl.angle < 0) ctrl.angle = 359;
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

    // GARANTIA FINAL: Antes de atirar, arredonda de novo só pra ter certeza absoluta
    const finalAngle = Math.round(ctrl.angle);

    console.log(`📊 Arma: ${weaponStats.name}`);
    console.log(`📊 Ângulo: ${finalAngle}°`); // Vai mostrar inteiro
    console.log(`📊 Força: ${Math.floor(ctrl.power)}`);

    if (player.components.cameraFocus) {
      delete player.components.cameraFocus;
    }

    const bullet = world.createEntity();

    const bomb = new BombObject(
      Date.now(),
      weaponStats.mass || 1,
      1,
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
