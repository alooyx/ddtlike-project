// Phy/physics.js - ROBUST VERSION (Simple Euler Integration)

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

    // Bounding box size
    this._size = {
      width: 10,
      height: 10,
    };

    this.isLiving = true;
    this.isMoving = false;

    // Physics State
    this.vx = 0;
    this.vy = 0;

    console.log(`🎯 Physics created: ID=${id}`);
  }

  /* =========================================
           GETTERS & SETTERS
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

  // Compatibility getters for velocity
  get vX() {
    return this.vx;
  }
  set vX(val) {
    this.vx = val;
  }
  get vY() {
    return this.vy;
  }
  set vY(val) {
    this.vy = val;
  }

  setRect(x, y, width, height) {
    this._size.width = width;
    this._size.height = height;
  }

  setXY(x, y) {
    this._x = x;
    this._y = y;
  }

  setSpeedXY(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  setMap(map) {
    this.map = map;
  }

  startMoving() {
    if (this.map) this.isMoving = true;
  }
  stopMoving() {
    this.isMoving = false;
  }
  die() {
    this.stopMoving();
    this.isLiving = false;
  }

  distance(x, y) {
    return Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
  }
}

/* =========================================
       PHYSICS SYSTEM (ECS System)
   ========================================= */
export class PhysicsSystem {
  constructor() {
    // ⚙️ PHYSICS CALIBRATION
    // This MUST match what's in CONFIG.GRAVITY for consistency
    this.gravity = CONFIG.GRAVITY || 0.6;

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
  // 🚀 PROJECTILE LOGIC (The Core Physics Loop)
  // =================================================================
  updateProjectiles(world) {
    const projectiles = world.query(["bombComponent", "position"]);

    projectiles.forEach((ent) => {
      const bombData = ent.components.bombComponent;
      const bomb = bombData.instance; // Instance of BombObject
      const pos = ent.components.position;

      // Skip dead projectiles
      if (!bomb.isLiving) {
        this.handleImpact(world, ent, bomb, bombData);
        return;
      }

      // --- 1. APPLY FORCES (Gravity & Wind) ---
      // We read global gravity and multiply by the bomb's factor (usually 1)
      const gravityForce =
        this.gravity *
        (bomb.gravityFactor !== undefined ? bomb.gravityFactor : 1);

      // We read global wind and multiply by the bomb's wind factor
      const globalWind = this.gameState ? this.gameState.wind : 0;
      const windForce =
        globalWind * (bomb.windFactor !== undefined ? bomb.windFactor : 0);

      // Simple Euler Integration: Vel += Accel
      bomb.vx += windForce;
      bomb.vy += gravityForce;

      // --- 2. CALCULATE NEXT POSITION ---
      const nextX = bomb.x + bomb.vx;
      const nextY = bomb.y + bomb.vy;

      // --- 3. MOVE & CHECK COLLISIONS ---
      // If the bomb has a specific moveTo method (Raycast), use it.
      if (bomb.moveTo) {
        bomb.moveTo(nextX, nextY);
      } else {
        // Fallback basic movement (no wall collision check)
        bomb.x = nextX;
        bomb.y = nextY;
      }

      // --- 4. SYNC VISUALS ---
      pos.x = bomb.x;
      pos.y = bomb.y;
    });
  }

  handleImpact(world, ent, bomb, bombData) {
    // --- Distance Log (Ruler Check) ---
    if (bombData.originX !== undefined) {
      const distPixels = Math.abs(bomb.x - bombData.originX);
      const ppi = CONFIG.PPI || 120;
      const distUnits = distPixels / ppi;

      console.log(`🎯 IMPACT!`);
      console.log(`   - Pixels: ${Math.floor(distPixels)}px`);
      console.log(`   - RULER: ${distUnits.toFixed(2)} Units`);
    }

    // --- Apply Terrain Destruction ---
    const weaponId = this.getWeaponIdFromProjectile(world);

    if (this.gameMap && !this.gameMap.isOutMap(bomb.x, bomb.y)) {
      this.terrainSys.applyImpact(bomb.x, bomb.y, bombData.impactId, weaponId);
    }

    world.removeEntity(ent.id);
    this.switchTurn(world);
  }

  // =================================================================
  // 🚶 PLAYER LOGIC (With Terrain Slope & Rotation)
  // =================================================================
  updatePlayers(world) {
    const players = world.query(["position", "body"]);

    players.forEach((ent) => {
      const pos = ent.components.position;
      const body = ent.components.body;

      if (!this.gameMap) return;

      // Respawn if falls off world
      if (pos.y > this.gameMap.height + 100) {
        pos.y = 100;
        pos.x = this.gameMap.width / 2;
        body.vY = 0;
        body.rotation = 0;
      }

      const feetX = Math.floor(pos.x);
      const feetY = Math.floor(pos.y + body.height / 2);

      // --- 1. SENSOR PROBES ---
      // We check 3 points to create a "Bridge" effect.
      // If the center is a hole, but sides are solid, we stay up.
      const halfWidth = body.width / 2 - 2; // slightly inside the sprite

      // CONFIG: How high can we step up? (Stairs)
      const stepHeight = 15;
      // CONFIG: How far down do we snap? (Slopes)
      const snapDist = 15;

      // Scan Left, Center, Right
      const lY = this.findGroundY(
        feetX - halfWidth,
        feetY,
        stepHeight,
        snapDist
      );
      const cY = this.findGroundY(feetX, feetY, stepHeight, snapDist);
      const rY = this.findGroundY(
        feetX + halfWidth,
        feetY,
        stepHeight,
        snapDist
      );

      // Filter out HOLES (null results)
      const contacts = [lY, cY, rY].filter((y) => y !== null);

      if (contacts.length > 0) {
        // --- 2. BRIDGE LOGIC ---
        // Stand on the HIGHEST point found (Min Y is higher in Canvas)
        const highestGroundY = Math.min(...contacts);

        // Snap position
        pos.y = highestGroundY - body.height / 2;
        body.isGrounded = true;
        body.vY = 0;

        // --- 3. SMART ROTATION ---
        // Calculate angle only if we have wide support (Left + Right)
        // This prevents jittering when standing on 1 pixel
        let targetRot = 0;

        if (lY !== null && rY !== null) {
          // Normal slope
          targetRot = Math.atan2(rY - lY, halfWidth * 2);
        } else if (lY !== null && cY !== null) {
          // Hanging off right edge
          targetRot = Math.atan2(cY - lY, halfWidth);
        } else if (cY !== null && rY !== null) {
          // Hanging off left edge
          targetRot = Math.atan2(rY - cY, halfWidth);
        } else {
          // Balancing on one point: Keep previous rotation or slowly level out
          targetRot = body.rotation || 0;
        }

        // Smooth rotation (Lerp)
        body.rotation = (body.rotation || 0) * 0.8 + targetRot * 0.2;
      } else {
        // --- 4. FALLING ---
        // No ground found under ANY sensor -> Free fall
        body.isGrounded = false;

        // Slowly straighten up while falling
        body.rotation = (body.rotation || 0) * 0.9;

        // Apply Gravity
        pos.y += 4;
      }
    });
  }

  // 🛠️ Helper: Finds first solid pixel in a specific vertical range
  findGroundY(x, feetY, stepUp, stepDown) {
    // Start searching from ABOVE the feet (to climb stairs)
    const startY = feetY - stepUp;
    // Stop searching BELOW the feet (to snap to slopes)
    const endY = feetY + stepDown;

    for (let y = startY; y <= endY; y++) {
      if (this.gameMap.isSolid(x, y)) {
        return y; // Found surface!
      }
    }
    return null; // Hole
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
      // Re-enable camera focus if you were using it
      if (players[0] && this.CameraFocus) {
        world.addComponent(players[0], "cameraFocus", this.CameraFocus());
      }
    }, 1000);
  }
}
