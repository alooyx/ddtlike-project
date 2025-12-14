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
        pos.x = this.gameMap.width / 2; // Center map
        body.vY = 0;
        body.rotation = 0;
      }

      // --- 📐 CÁLCULO DE INCLINAÇÃO (SLOPE PHYSICS) ---
      const feetX = Math.floor(pos.x);
      const feetY = Math.floor(pos.y + body.height / 2);

      // Verifica o chão um pouco à esquerda e à direita (-5 e +5 pixels)
      // Isso nos dá dois pontos para traçar uma linha e descobrir o ângulo
      const dist = 9;
      const leftY = this.findGroundY(feetX - dist, feetY);
      const rightY = this.findGroundY(feetX + dist, feetY);

      if (leftY !== null && rightY !== null) {
        // Trigonometria: Calcula o ângulo pela diferença de altura
        const dy = rightY - leftY;
        const dx = dist * 2;

        // Calcula a rotação alvo (o quanto o chão está inclinado)
        const targetRotation = Math.atan2(dy, dx);

        // Suavização (Lerp): Move 10% em direção ao alvo para não tremer
        body.rotation = (body.rotation || 0) * 0.9 + targetRotation * 0.1;

        // Ajusta a posição Y para a média das duas rodas (andar suave)
        const avgY = (leftY + rightY) / 2;

        // Snap to Ground: Se estiver perto (<10px), gruda no chão
        if (Math.abs(pos.y + body.height / 2 - avgY) < 10) {
          pos.y = avgY - body.height / 2;
          body.isGrounded = true;
        } else {
          // Se o chão desceu muito rápido, cai
          body.isGrounded = false;
        }
      } else {
        // Se não achou chão (buraco fundo), cai e zera a rotação
        body.isGrounded = false;
        body.rotation = (body.rotation || 0) * 0.9; // Volta pra 0 devagar
      }

      // Gravidade simples se não estiver no chão
      if (!body.isGrounded) {
        pos.y += 4;
      }
    });
  }

  // 🛠️ Helper para encontrar a superfície do chão rapidamente
  findGroundY(x, startY) {
    // Procura num raio vertical de 30px (pra cima e pra baixo)
    // Otimização para não varrer o mapa todo
    const searchRange = 30;
    for (let y = startY - searchRange; y < startY + searchRange; y++) {
      if (this.gameMap.isSolid(x, y)) {
        return y;
      }
    }
    return null; // Não achou chão perto (Buraco)
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
