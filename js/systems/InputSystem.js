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
      if (ctrl.virtualAngle === undefined) ctrl.virtualAngle = ctrl.angle;

      // ============================================================
      // ⚙️ SENSIBILIDADE
      // ============================================================
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
        ctrl.virtualAngle += ANGLE_STEP;
        changed = true;

        if (ctrl.virtualAngle >= 360) ctrl.virtualAngle = 0;
      }

      if (this.keys["ArrowDown"]) {
        ctrl.virtualAngle -= ANGLE_STEP;
        changed = true;

        if (ctrl.virtualAngle < 0) ctrl.virtualAngle = 359.9;
      }

      if (changed) {
        // Trava de Ouro: Ângulo sempre inteiro
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
    const body = player.components.body; // <--- PEGUE O BODY (Tem a rotação)
    const weaponStats = WEAPON_DB[ctrl.weaponId];

    // 1. Ângulo da UI (Régua)
    const uiAngle = Math.floor(ctrl.angle);

    // 2. Inclinação do Terreno (Calculado no PhysicsSystem)
    // Converte de radianos (física) para graus
    // Invertemos o sinal (-) porque no Canvas Y cresce pra baixo
    let terrainAngle = 0;
    if (body && body.rotation) {
      terrainAngle = -((body.rotation * 180) / Math.PI);
    }

    // 3. CÁLCULO FINAL (SOMA TUDO)
    let finalAngle;

    if (ctrl.facingRight) {
      // Direita: Ângulo UI + Terreno
      finalAngle = uiAngle + terrainAngle;
    } else {
      // Esquerda: O terreno gira o eixo inteiro.
      // A lógica é: (180 - UI) para virar pra esquerda, + Terreno
      finalAngle = 180 - uiAngle + terrainAngle;
    }

    console.log(
      `📐 UI: ${uiAngle}° | Terreno: ${terrainAngle.toFixed(
        1
      )}° | Final: ${finalAngle.toFixed(1)}°`
    );
    console.log(`📊 Força: ${Math.floor(ctrl.power)}`);

    if (player.components.cameraFocus) {
      delete player.components.cameraFocus;
    }

    const bullet = world.createEntity();

    const bomb = new BombObject(
      Date.now(),
      weaponStats.mass || 1,
      CONFIG.GRAVITY || 1,
      0, // Vento
      0, // Ar
      weaponStats.projSize || 10,
      weaponStats.projSize || 10
    );

    bomb.setMap(this.gameMap);

    const cannonLength = 30;
    const pivotX = pos.x;
    const pivotY = pos.y - 15;

    // Converte o Ângulo Final (Graus) para Radianos para a física
    const rad = (finalAngle * Math.PI) / 180;

    const startX = pivotX + Math.cos(rad) * cannonLength;
    const startY = pivotY - Math.sin(rad) * cannonLength; // Y é invertido no canvas

    bomb.setXY(startX, startY);

    const powerPercent = ctrl.power / 100;
    const speedMagnitude = powerPercent * weaponStats.speedMult;

    // Calcula velocidade usando o ângulo combinado
    const vx = Math.cos(rad) * speedMagnitude;
    const vy = -Math.sin(rad) * speedMagnitude; // Y invertido

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
