// Phy/physics.js - VERSÃO CORRIGIDA

export class Physics {
  constructor(id) {
    this.id = id;
    this.map = null;

    // Posição central do objeto
    this._x = 0;
    this._y = 0;

    // Tamanho e offset do bounding box
    this._size = {
      offsetX: -5,
      offsetY: -5,
      width: 10,
      height: 10,
    };

    this.rectBomb = { x: 0, y: 0, width: 0, height: 0 };
    this.isLiving = true;
    this.isMoving = false;

    console.log(`🎯 Physics criado: ID=${id}`);
  }

  /* =========================================
         GETTERS & SETTERS (Posição Central)
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
         GETTER DE COLISÃO GLOBAL (Crucial)
     ========================================= */
  /**
   * Retorna o retângulo de colisão (bounding box) em COORDENADAS GLOBAIS.
   * Este é o getter que o Map.js acessa para findPhysicalObjects.
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
         MÉTODOS DE CONFIGURAÇÃO
     ========================================= */

  getCollidePoint() {
    return { x: this.x, y: this.y };
  }

  /**
   * Define o tamanho do bounding box
   * @param {number} x - Offset X local (geralmente negativo)
   * @param {number} y - Offset Y local (geralmente negativo)
   * @param {number} width - Largura
   * @param {number} height - Altura
   */
  setRect(x, y, width, height) {
    this._size.offsetX = x;
    this._size.offsetY = y;
    this._size.width = width;
    this._size.height = height;

    console.log(`📦 Rect definido: offset(${x},${y}) size(${width}x${height})`);
  }

  setRectBomb(x, y, width, height) {
    this.rectBomb.x = x;
    this.rectBomb.y = y;
    this.rectBomb.width = width;
    this.rectBomb.height = height;
  }

  setXY(x, y) {
    this._x = x;
    this._y = y;
  }

  setMap(map) {
    if (this.map && this.map !== map) {
      console.log(`🗺️ Objeto ${this.id} mudando de mapa`);
    }
    this.map = map;
  }

  /* =========================================
         CONTROLE DE MOVIMENTO
     ========================================= */

  startMoving() {
    if (this.map) {
      this.isMoving = true;
      console.log(`▶️ Objeto ${this.id} começou a se mover`);
    } else {
      console.warn(`⚠️ Tentativa de mover objeto ${this.id} sem mapa!`);
    }
  }

  stopMoving() {
    this.isMoving = false;
    console.log(`⏸️ Objeto ${this.id} parou de se mover`);
  }

  die() {
    this.stopMoving();
    this.isLiving = false;
    console.log(`💀 Objeto ${this.id} morreu`);
  }

  /* =========================================
         MÉTODOS VIRTUAIS (Para sobrescrever)
     ========================================= */

  collidedByObject(phy) {
    // Virtual method intended to be overridden
  }

  prepareNewTurn() {
    // Virtual method intended to be overridden
  }

  /* =========================================
         UTILITÁRIOS
     ========================================= */

  distance(x, y) {
    return Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
  }

  static pointToLine(x1, y1, x2, y2, px, py) {
    const a = y1 - y2;
    const b = x2 - x1;
    const c = x1 * y2 - x2 * y1;
    return Math.abs(a * px + b * py + c) / Math.sqrt(a * a + b * b);
  }

  dispose() {
    if (this.map) {
      if (typeof this.map.removePhysical === "function") {
        this.map.removePhysical(this);
      }
    }
  }
}

/* =========================================
       PHYSICS SYSTEM (ECS)
   ========================================= */

export class PhysicsSystem {
  constructor() {
    this.gameMap = null;
    this.GAME_STATE = null;
    this.TerrainSystem = null;
    this.CameraFocus = null;
  }

  // Método para injetar dependências
  setDependencies(gameMap, GAME_STATE, TerrainSystem, CameraFocus) {
    this.gameMap = gameMap;
    this.GAME_STATE = GAME_STATE;
    this.TerrainSystem = TerrainSystem;
    this.CameraFocus = CameraFocus;
    console.log("🔧 PhysicsSystem configurado com dependências");
  }
  // Adicione no PhysicsSystem:

  getWeaponIdFromProjectile(world) {
    const players = world.query(["playerControl"]);
    if (players.length > 0) {
      return players[0].components.playerControl.weaponId;
    }
    return "missile"; // Fallback
  }

  update(world) {
    // 1. ATUALIZA PROJÉTEIS
    this.updateProjectiles(world);

    // 💥 ADICIONE ISTO DEPOIS DOS PROJÉTEIS:

    // Remove explosões após duração
    const explosions = world.query(["explosion"]);
    explosions.forEach((ent) => {
      const exp = ent.components.explosion;
      const elapsed = Date.now() - exp.startTime;

      if (elapsed >= exp.duration) {
        world.markForRemoval(ent);
        console.log("💥 Explosão removida");
      }
    });

    // ... resto do código (players, etc) ...

    // 2. ATUALIZA PLAYERS (Gravidade)
    this.updatePlayers(world);
  }

  /* =========================================
         ATUALIZAÇÃO DE PROJÉTEIS
     ========================================= */

  updateProjectiles(world) {
    const projectiles = world.query(["bombComponent", "position"]);

    projectiles.forEach((ent) => {
      const bombData = ent.components.bombComponent;
      const bomb = bombData.instance;
      const pos = ent.components.position;

      // Atualiza a física da bomba
      bomb.update();

      // Sincroniza a posição do ECS com a física
      pos.x = bomb.x;
      pos.y = bomb.y;

      // Verifica se a bomba morreu
      if (!bomb.isLiving) {
        console.log(
          `💥 Projétil morreu em (${Math.floor(pos.x)}, ${Math.floor(pos.y)})`
        );

        // Verifica se está dentro do mapa antes de escavar
        if (this.gameMap && !this.gameMap.isOutMap(pos.x, pos.y)) {
          // --- MUDANÇA AQUI (Caso 1: Morte do Projétil) ---
          const weaponId = this.getWeaponIdFromProjectile(world);
          this.TerrainSystem.applyImpact(
            pos.x,
            pos.y,
            bombData.impactId,
            weaponId
          );
          // ------------------------------------------------
        }

        world.markForRemoval(ent);
        this.switchTurn(world);
      }
      // Verifica colisão com terreno (checagem manual extra)
      else if (this.gameMap && this.gameMap.ground) {
        const px = Math.floor(pos.x);
        const py = Math.floor(pos.y);

        // Verifica um quadrado 2x2 ao redor da posição
        const hitsTerrain = !this.gameMap.ground.isRectangleEmptyQuick(
          px - 1,
          py - 1,
          2,
          2
        );

        if (hitsTerrain) {
          console.log(`🎯 Projétil colidiu com terreno em (${px}, ${py})`);

          // --- MUDANÇA AQUI (Caso 2: Colisão com Terreno) ---
          const weaponId = this.getWeaponIdFromProjectile(world);
          this.TerrainSystem.applyImpact(
            pos.x,
            pos.y,
            bombData.impactId,
            weaponId
          );
          // -------------------------------------------------

          world.markForRemoval(ent);
          this.switchTurn(world);
        }
      }
    });
  }

  /* =========================================
         ATUALIZAÇÃO DE PLAYERS (GRAVIDADE)
     ========================================= */

  updatePlayers(world) {
    const players = world.query(["position", "body"]);

    players.forEach((ent) => {
      const pos = ent.components.position;
      const body = ent.components.body;

      // Validação de segurança
      if (!this.gameMap || !this.gameMap.ground) {
        console.warn("⚠️ PhysicsSystem: gameMap ou ground não existe!");
        return;
      }

      // --- TRAVA DE SEGURANÇA: Impede queda infinita ---
      const mapHeight = this.gameMap.bound.height;
      if (pos.y > mapHeight - 20) {
        pos.y = mapHeight - 20;
        body.isGrounded = true;
        console.log("🛡️ Player segurado no fundo do mapa");
        return;
      }

      // --- FÍSICA DE GRAVIDADE ---

      // Calcula a posição dos "pés" do tank
      const feetX = Math.floor(pos.x);
      const feetY = Math.floor(pos.y + body.height / 2);

      // Verifica se há ar 1 pixel abaixo dos pés
      const checkWidth = 8; // Largura da verificação
      const checkX = feetX - checkWidth / 2;

      const isAirBelow = this.gameMap.ground.isRectangleEmptyQuick(
        checkX,
        feetY + 1,
        checkWidth,
        2
      );

      if (isAirBelow) {
        // Está no ar - aplica gravidade
        pos.y += 3; // Velocidade de queda
        body.isGrounded = false;

        // Verifica se caiu demais (fora do mapa)
        if (pos.y > mapHeight + 100) {
          console.log("☠️ Player caiu fora do mapa - Respawn");
          pos.y = 100;
          pos.x = this.gameMap.bound.width / 2;
        }
      } else {
        // Está tocando o chão
        body.isGrounded = true;

        // Ajusta a posição para ficar exatamente em cima do chão
        let safety = 0;
        while (
          !this.gameMap.ground.isRectangleEmptyQuick(
            checkX,
            Math.floor(pos.y + body.height / 2),
            checkWidth,
            2
          ) &&
          safety < 20
        ) {
          pos.y -= 0.5; // Move para cima devagar
          safety++;
        }

        if (safety > 0) {
          console.log(`⬆️ Player ajustado ${safety * 0.5}px para cima`);
        }
      }
    });
  }

  /* =========================================
         TROCA DE TURNO
     ========================================= */

  switchTurn(world) {
    if (!this.GAME_STATE) {
      console.warn("⚠️ GAME_STATE não configurado!");
      return;
    }

    this.GAME_STATE.turn = "waiting";
    console.log("⏳ Esperando para próximo turno...");

    setTimeout(() => {
      this.GAME_STATE.turn = "player";
      console.log("✅ Turno do player");

      const players = world.query(["playerControl"]);
      if (players[0] && this.CameraFocus) {
        world.addComponent(players[0], "cameraFocus", this.CameraFocus());
      }
    }, 1000);
  }
}
