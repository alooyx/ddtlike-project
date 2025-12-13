// Phy/physics.js - CORRECTED AND COMPLETE VERSION

// 1. Import CONFIG to access PPI
import { CONFIG } from "../config.js";

/* =========================================
       BASE CLASS PHYSICS (Physical Object)
   ========================================= */
export class Physics {
  constructor(id) {
    this.id = id;
    this.map = null;

    // Center position
    this._x = 0;
    this._y = 0;

    // Bounding box size and offset
    this._size = {
      offsetX: -5,
      offsetY: -5,
      width: 10,
      height: 10,
    };

    this.rectBomb = { x: 0, y: 0, width: 0, height: 0 };
    this.isLiving = true;
    this.isMoving = false;

    console.log(`🎯 Physics created: ID=${id}`);
  }

  /* =========================================
           GETTERS & SETTERS (Center Position)
       ========================================= */

  get x() {
    return this._x;
  }

  set x(value) {
    this._x = value;
  }

  get y() {
    return this._y;
  }

  set y(value) {
    this._y = value;
  }

  /* =========================================
           GLOBAL COLLISION GETTER
       ========================================= */
  /**
   * Returns collision rectangle (bounding box) in GLOBAL COORDINATES.
   */
  get rect() {
    const halfWidth = this._size.width / 2;
    const halfHeight = this._size.height / 2;

    return {
      x: Math.floor(this._x - halfWidth),
      y: Math.floor(this._y - halfHeight),
      width: this._size.width,
      height: this._size.height,
    };
  }

  /* =========================================
           CONFIGURATION METHODS
       ========================================= */

  getCollidePoint() {
    return { x: this.x, y: this.y };
  }

  setRect(x, y, width, height) {
    this._size.offsetX = x;
    this._size.offsetY = y;
    this._size.width = width;
    this._size.height = height;
  }

  setXY(x, y) {
    this._x = x;
    this._y = y;
  }

  setMap(map) {
    this.map = map;
  }

  /* =========================================
           MOVEMENT CONTROL
       ========================================= */

  startMoving() {
    if (this.map) {
      this.isMoving = true;
    }
  }

  stopMoving() {
    this.isMoving = false;
  }

  die() {
    this.stopMoving();
    this.isLiving = false;
  }

  /* =========================================
           UTILITIES
       ========================================= */

  distance(x, y) {
    return Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
  }

  dispose() {
    if (this.map && typeof this.map.removePhysical === "function") {
      this.map.removePhysical(this);
    }
  }
}

/* =========================================
       PHYSICS SYSTEM (ECS System)
   ========================================= */
export class PhysicsSystem {
  constructor() {
    // ⚙️ PHYSICS CALIBRATION
    this.gravity = 0.6;

    // Dependencies
    this.gameMap = null;
    this.gameState = null;
    this.terrainSys = null;
    this.CameraFocus = null;
  }

  setDependencies(gameMap, gameState, terrainSys, CameraFocus) {
    this.gameMap = gameMap;
    this.gameState = gameState;
    this.terrainSys = terrainSys;
    this.CameraFocus = CameraFocus;
    console.log("🔧 PhysicsSystem: Dependencies injected");
  }

  getWeaponIdFromProjectile(world) {
    const players = world.query(["playerControl"]);
    if (players.length > 0) {
      return players[0].components.playerControl.weaponId;
    }
    return "missile";
  }

  update(world) {
    this.updateProjectiles(world);
    this.updatePlayers(world);
    this.cleanupExplosions(world);
  }

  // =================================================================
  // 🚀 PROJECTILE LOGIC
  // =================================================================
  updateProjectiles(world) {
    const projectiles = world.query(["bombComponent", "position"]);

    projectiles.forEach((ent) => {
      const bombData = ent.components.bombComponent;
      const bomb = bombData.instance; // Instance of BombObject (extends Physics)
      const pos = ent.components.position;

      // Call update of the bomb itself (BombObject.js logic)
      if (bomb.update) {
        bomb.update();
      } else {
        // Fallback simple physics
        bomb.vY += this.gravity;
        bomb.x += bomb.vX;
        bomb.y += bomb.vY;
      }

      // Sync visually
      pos.x = bomb.x;
      pos.y = bomb.y;

      // Check if dead (collision handled inside BombObject)
      if (!bomb.isLiving) {
        // --- Distance Log (Using PPI) ---
        if (bombData.originX !== undefined) {
          const distPixels = Math.abs(bomb.x - bombData.originX);

          // ✅ UPDATED: Calculate units based on CONFIG.PPI
          const ppi = CONFIG.PPI || 120; // Default to 120 if config missing
          const distUnits = distPixels / ppi;

          console.log(`🎯 IMPACT!`);
          console.log(`   - Pixels: ${Math.floor(distPixels)}px`);
          console.log(`   - RULER: ${distUnits.toFixed(2)} Units`);
        }

        // --- Apply Impact ---
        const weaponId = this.getWeaponIdFromProjectile(world);

        // Check map bounds before digging
        if (this.gameMap && !this.gameMap.isOutMap(bomb.x, bomb.y)) {
          this.terrainSys.applyImpact(
            bomb.x,
            bomb.y,
            bombData.impactId,
            weaponId
          );
        }

        world.removeEntity(ent.id);
        this.switchTurn(world);
      }
    });
  }

  // =================================================================
  // 🚶 PLAYER LOGIC
  // =================================================================
  updatePlayers(world) {
    const players = world.query(["position", "body"]);

    players.forEach((ent) => {
      const pos = ent.components.position;
      const body = ent.components.body;

      if (!this.gameMap) return;

      if (pos.y > this.gameMap.height + 100) {
        pos.y = 100;
        pos.x = 600;
        body.vY = 0;
      }

      const feetX = Math.floor(pos.x);
      const feetY = Math.floor(pos.y + body.height / 2);

      const hasGround = this.gameMap.isSolid(feetX, feetY + 1);

      if (!hasGround) {
        pos.y += 4;
        body.isGrounded = false;
      } else {
        body.isGrounded = true;
        if (this.gameMap.isSolid(feetX, feetY)) {
          pos.y -= 1;
        }
      }
    });
  }

  cleanupExplosions(world) {
    const explosions = world.query(["explosion"]);
    explosions.forEach((ent) => {
      const exp = ent.components.explosion;
      if (Date.now() - exp.startTime >= exp.duration) {
        world.removeEntity(ent.id);
      }
    });
  }

  switchTurn(world) {
    if (!this.gameState) return;
    this.gameState.turn = "waiting";
    setTimeout(() => {
      this.gameState.turn = "player";
      const players = world.query(["playerControl"]);
      if (players[0] && this.CameraFocus) {
        world.addComponent(players[0], "cameraFocus", this.CameraFocus());
      }
    }, 1000);
  }
}
