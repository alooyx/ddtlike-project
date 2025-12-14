import { Physics } from "../physics.js";

export class BombObject extends Physics {
  constructor(
    id,
    mass = 1,
    gravityFactor = 1,
    windFactor = 0,
    airResistFactor = 0,
    width = 10,
    height = 10
  ) {
    super(id); // Physics class sets _x, _y

    // --- PHYSICS PROPERTIES ---
    this.mass = mass;
    this.gravityFactor = gravityFactor;
    this.windFactor = windFactor;
    this.airResistFactor = airResistFactor;

    // Standard Velocity (No more complex EulerVector)
    this.vx = 0;
    this.vy = 0;

    // Define centralized bounding box
    this.setRect(-(width / 2), -(height / 2), width, height);

    this.isMoving = true;
    this.isLiving = true;
    this.isExploded = false; // Flag to prevent double explosions

    console.log(`🚀 BombObject created: ID=${id}`);
  }

  /* =========================================
           GETTERS & SETTERS
     ========================================= */

  // Compatibility with PhysicsSystem (it might ask for vX/vY)
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

  setSpeedXY(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    console.log(`🎯 Initial Speed: vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}`);
  }

  /* =========================================
           COLLISION LOGIC (RAYCAST)
     ========================================= */

  /**
   * Tries to move from current (x,y) to target (px,py).
   * Checks every pixel in between for collision.
   */
  moveTo(px, py) {
    // If dead or same position, do nothing
    if (!this.isLiving || (px === this.x && py === this.y)) return;

    const dx = px - this.x;
    const dy = py - this.y;

    // Calculate how many steps (pixels) we need to check
    // We check every few pixels to be fast but accurate
    let count = Math.max(Math.abs(dx), Math.abs(dy));
    let dtStep = 1.0;

    // Optimization: If moving very fast, check every 2 pixels instead of 1
    // to save CPU.
    const stepSize = 2;

    // Normalize direction
    const xStep = dx / count;
    const yStep = dy / count;

    let nextX = this.x;
    let nextY = this.y;

    // RAYCAST LOOP
    // We walk from Start -> End checking for collisions
    for (let i = 0; i < count; i += stepSize) {
      nextX += xStep * stepSize;
      nextY += yStep * stepSize;

      // 1. TERRAIN COLLISION (Most common)
      if (this.map && this.map.ground) {
        // Check a small box around the bullet tip
        if (
          !this.map.ground.isRectangleEmptyQuick(
            Math.floor(nextX) - 1,
            Math.floor(nextY) - 1,
            3,
            3
          )
        ) {
          this.x = nextX;
          this.y = nextY;
          this.collideGround();
          return;
        }
      }

      // 2. MAP BOUNDARIES
      if (this.map && this.map.isOutMap && this.map.isOutMap(nextX, nextY)) {
        this.x = nextX;
        this.y = nextY;
        this.flyoutMap();
        return;
      }

      // 3. OBJECT COLLISION (Tanks, etc)
      // Note: We usually check this less frequently or let PhysicsSystem handle simple AABB
      // But for bullets, keeping it here ensures we hit tanks accurately.
      if (this.map && this.map.findPhysicalObjects) {
        const rect = {
          x: nextX - 2,
          y: nextY - 2,
          width: 4,
          height: 4,
        };
        const hits = this.map.findPhysicalObjects(rect, this); // 'this' to ignore self

        // Filter out owner if needed (PhysicsSystem handles logic, but BombObject detects hit)
        if (hits.length > 0) {
          this.x = nextX;
          this.y = nextY;
          this.collideObjects(hits);
          return;
        }
      }
    }

    // If no collision, update to final position
    this.setXY(px, py);
  }

  /* =========================================
           EVENTS (Callbacks)
     ========================================= */

  collideObjects(list) {
    if (this.isExploded) return;
    console.log("💥 Hit Object");
    this.stopMoving();
    this.die();
  }

  collideGround() {
    if (this.isExploded) return;
    console.log("💥 Hit Ground");
    this.stopMoving();
    this.die();
  }

  flyoutMap() {
    console.log("🌊 Left Map");
    this.stopMoving();
    this.die();
  }

  stopMoving() {
    this.isMoving = false;
  }

  die() {
    this.isLiving = false;
    this.isExploded = true;
  }
}
