// Phy/Object/BombObject.js - REFINED VERSION

import { Physics } from "../physics.js";
import { EulerVector } from "../maths/EulerVector.js";

export class BombObject extends Physics {
  constructor(
    id,
    mass = 10,
    gravityFactor = 100,
    windFactor = 1,
    airResistFactor = 1,
    width = 4,
    height = 4
  ) {
    super(id);

    this.mass = mass;
    this.gravityFactor = gravityFactor;
    this.windFactor = windFactor;
    this.airResistFactor = airResistFactor;

    // Euler vectors for physics (position, velocity, acceleration)
    this.m_vx = new EulerVector(0, 0, 0);
    this.m_vy = new EulerVector(0, 0, 0);

    // Define centralized bounding box
    this.setRect(-(width / 2), -(height / 2), width, height);

    // Calculated factors (Air Resistance, Gravity, Wind)
    this.arf = 0;
    this.gf = 0;
    this.wf = 0;

    this.isMoving = true;
    this.isLiving = true;

    console.log(
      `🚀 BombObject created: ID=${id}, mass=${mass}, size=${width}x${height}`
    );
  }

  /* =========================================
           VELOCITY GETTERS
     ========================================= */

  get vX() {
    return this.m_vx.x1;
  }

  get vY() {
    return this.m_vy.x1;
  }

  /* =========================================
           INITIAL CONFIGURATION
     ========================================= */

  setSpeedXY(vx, vy) {
    this.m_vx.x1 = vx;
    this.m_vy.x1 = vy;
    console.log(`🎯 Initial Speed: vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}`);
  }

  setXY(x, y) {
    // Directly call super.setXY since BombObject extends Physics
    super.setXY(x, y);

    this.m_vx.x0 = x;
    this.m_vy.x0 = y;
  }

  setMap(map) {
    // Directly call super.setMap
    super.setMap(map);

    this.updateAGW();
  }

  /* =========================================
           PHYSICS - FORCE FACTORS
     ========================================= */

  updateForceFactor(air, gravity, wind) {
    this.airResistFactor = air;
    this.gravityFactor = gravity;
    this.windFactor = wind;
    this.updateAGW();
  }

  updateAGW() {
    if (!this.map) return;

    const mapAir =
      this.map.airResistance !== undefined ? this.map.airResistance : 0;
    const mapGrav = this.map.gravity !== undefined ? this.map.gravity : 0.001;
    const mapWind = this.map.wind !== undefined ? this.map.wind : 0;

    this.arf = mapAir * this.airResistFactor;
    this.gf = mapGrav * this.gravityFactor * this.mass;
    this.wf = mapWind * this.windFactor;

    console.log(
      `⚙️ Physics Factors: air=${this.arf.toFixed(3)}, grav=${this.gf.toFixed(
        3
      )}, wind=${this.wf.toFixed(3)}`
    );
  }

  /* =========================================
           PHYSICS - EULER INTEGRATION
     ========================================= */

  completeNextMovePoint(dt) {
    this.m_vx.computeOneEulerStep(this.mass, this.arf, this.wf, dt);
    this.m_vy.computeOneEulerStep(this.mass, this.arf, this.gf, dt);

    return {
      x: Math.floor(this.m_vx.x0),
      y: Math.floor(this.m_vy.x0),
    };
  }

  /* =========================================
           MAIN UPDATE LOOP
     ========================================= */

  update() {
    if (!this.isMoving) return;

    // Fixed DT for stability
    const dt = 0.1;

    // 1. Calculate next point based on physics
    const nextPoint = this.completeNextMovePoint(dt);

    // 2. Move trying to reach there (checking collisions along the way)
    this.moveTo(nextPoint.x, nextPoint.y);
  }

  /* =========================================
           MOVEMENT WITH RAYCAST
     ========================================= */

  moveTo(px, py) {
    if (px === this.x && py === this.y) return;

    const dx = px - this.x;
    const dy = py - this.y;
    let count = 0;
    let dtStep = 1;
    let useX = true;

    // Determine major axis
    if (Math.abs(dx) > Math.abs(dy)) {
      useX = true;
      count = Math.abs(dx);
      dtStep = dx / count;
    } else {
      useX = false;
      count = Math.abs(dy);
      dtStep = dy / count;
    }

    let dest = { x: this.x, y: this.y };

    // Raycast: Check collision pixel by pixel along the path
    for (let i = 1; i <= count; i += 2) {
      // i += 2 optimization
      if (useX) {
        dest = this.getNextPointByX(
          this.x,
          px,
          this.y,
          py,
          this.x + i * dtStep
        );
      } else {
        dest = this.getNextPointByY(
          this.x,
          px,
          this.y,
          py,
          this.y + i * dtStep
        );
      }

      // --- CHECK 1: COLLISION WITH PHYSICAL OBJECTS ---
      const currentRect = {
        x: Math.floor(dest.x - this._size.width / 2),
        y: Math.floor(dest.y - this._size.height / 2),
        width: this._size.width,
        height: this._size.height,
      };

      let list = [];
      if (this.map && this.map.findPhysicalObjects) {
        list = this.map.findPhysicalObjects(currentRect, this);
      }

      if (list && list.length > 0) {
        console.log(`💥 Bomb collided with ${list.length} physical object(s)`);
        this.setXY(dest.x, dest.y);
        this.collideObjects(list);
        if (!this.isLiving || !this.isMoving) return;
      }

      // --- CHECK 2: COLLISION WITH TERRAIN ---
      else if (this.map && this.map.ground) {
        const checkX = Math.floor(dest.x);
        const checkY = Math.floor(dest.y);

        // Check a 3x3 square around position
        const hitsTerrain = !this.map.ground.isRectangleEmptyQuick(
          checkX - 1,
          checkY - 1,
          3,
          3
        );

        if (hitsTerrain) {
          console.log(`🎯 Bomb hit terrain at (${checkX}, ${checkY})`);
          this.setXY(dest.x, dest.y);
          this.collideGround();
          return;
        }
      }

      // --- CHECK 3: OUT OF MAP ---
      else if (
        this.map &&
        this.map.isOutMap &&
        this.map.isOutMap(dest.x, dest.y)
      ) {
        console.log(
          `🌊 Bomb left map at (${Math.floor(dest.x)}, ${Math.floor(dest.y)})`
        );
        this.setXY(dest.x, dest.y);
        this.flyoutMap();
        return;
      }
    }

    // If reached here, no collision - update position
    this.setXY(px, py);
  }

  /* =========================================
           COLLISION HANDLERS
     ========================================= */

  collideObjects(list) {
    console.log("💥 collideObjects called");
    this.stopMoving();
    this.die();
  }

  collideGround() {
    console.log("💥 collideGround called");
    this.stopMoving();
    this.die();
  }

  flyoutMap() {
    console.log("🌊 flyoutMap called");
    this.stopMoving();
    if (this.isLiving) {
      this.die();
    }
  }

  stopMoving() {
    this.isMoving = false;
  }

  die() {
    this.isLiving = false;
  }

  /* =========================================
           GEOMETRY - LINEAR INTERPOLATION
     ========================================= */

  getNextPointByX(x1, x2, y1, y2, x) {
    if (x2 === x1) return { x: x, y: y1 };
    const y = ((x - x1) * (y2 - y1)) / (x2 - x1) + y1;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  getNextPointByY(x1, x2, y1, y2, y) {
    if (y2 === y1) return { x: x1, y: y };
    const x = ((y - y1) * (x2 - x1)) / (y2 - y1) + x1;
    return { x: Math.floor(x), y: Math.floor(y) };
  }
}
