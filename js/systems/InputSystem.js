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

      // Movimento com flip de direção
      if (this.keys["ArrowLeft"]) {
        pos.x -= CONFIG.moveSpeed;
        ctrl.facingRight = false;
      }
      if (this.keys["ArrowRight"]) {
        pos.x += CONFIG.moveSpeed;
        ctrl.facingRight = true;
      }

      if (this.keys["ArrowUp"]) ctrl.angle = Math.min(180, ctrl.angle + 1);
      if (this.keys["ArrowDown"]) ctrl.angle = Math.max(0, ctrl.angle - 1);

      if (this.keys["Space"]) {
        ctrl.isCharging = true;
        ctrl.power = Math.min(100, ctrl.power + 1);
      } else {
        if (this.fireReleased && ctrl.power > 0) {
          this.spawnProjectile(world, ent);
          ctrl.power = 50;
          ctrl.isCharging = false;
          this.fireReleased = false;
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

    console.log(`📊 Arma: ${weaponStats.name}`);
    console.log(`📊 Ângulo: ${ctrl.angle}°`);
    console.log(`📊 Força: ${ctrl.power}`);

    delete player.components.cameraFocus;

    const bullet = world.createEntity();

    const bomb = new BombObject(
      Date.now(),
      10,
      0.08,
      1,
      1,
      weaponStats.projSize,
      weaponStats.projSize
    );

    bomb.setMap(this.gameMap);

    const startX = pos.x;
    const startY = pos.y - 20;
    bomb.setXY(startX, startY);

    const rad = (ctrl.angle * Math.PI) / 180;
    const powerBase = ctrl.power * 1.2 * weaponStats.speedMult;
    const vx = Math.cos(rad) * powerBase;
    const vy = -Math.sin(rad) * powerBase;

    bomb.setSpeedXY(vx, vy);

    console.log(`🎯 Posição: (${startX}, ${startY})`);
    console.log(`🎯 Velocidade: vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}`);

    world.addComponent(
      bullet,
      "bombComponent",
      BombComponent(bomb, weaponStats.impactId)
    );
    world.addComponent(bullet, "position", Position(startX, startY));

    // Verifica sprite
    if (weaponStats.spriteId && weaponStats.sprite) {
      const spriteSheet = this.spriteManager.get(weaponStats.spriteId);

      if (spriteSheet && spriteSheet.loaded) {
        const animation = new SpriteAnimation(spriteSheet, true);
        world.addComponent(
          bullet,
          "renderable",
          SpriteRenderable(animation, weaponStats.sprite.scale)
        );
        console.log(`🎨 Projétil usando sprite: ${weaponStats.spriteId}`);
      } else {
        console.warn(`⚠️ Sprite não encontrada: ${weaponStats.spriteId}`);
        world.addComponent(
          bullet,
          "renderable",
          Renderable("projectile", weaponStats.color, weaponStats.projSize)
        );
      }
    } else {
      world.addComponent(
        bullet,
        "renderable",
        Renderable("projectile", weaponStats.color, weaponStats.projSize)
      );
    }

    world.addComponent(bullet, "cameraFocus", CameraFocus());

    console.log("✅ Projétil spawned\n");
  }
}
