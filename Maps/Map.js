// Maps/Map.js - VERSÃO CORRIGIDA COM DEBUG

export class Map {
  constructor(info, layer1, layer2) {
    this._info = info;
    this._wind = 0;
    this._objects = new Set();
    this._layer1 = layer1; // Camada principal (Física/Destrutível)
    this._layer2 = layer2; // Camada secundária (opcional)

    this._spawnPoints = {
      teamA: [],
      teamB: [],
    };

    // Define os limites do mapa
    if (this._layer1) {
      this._bound = {
        x: 0,
        y: 0,
        width: this._layer1.width,
        height: this._layer1.height,
      };
    } else {
      this._bound = { x: 0, y: 0, width: 0, height: 0 };
    }

    console.log(`🗺️ Map criado: ${this._bound.width}x${this._bound.height}`);
  }

  /* =========================================
         GETTERS & SETTERS
     ========================================= */

  get wind() {
    return this._wind;
  }
  set wind(value) {
    this._wind = value;
  }

  get gravity() {
    return this._info?.weight || 9.8;
  }

  get airResistance() {
    return this._info?.dragIndex || 0;
  }

  // CRÍTICO: Expõe o layer1 como "ground"
  get ground() {
    return this._layer1;
  }

  get info() {
    return this._info;
  }

  get bound() {
    return this._bound;
  }

  /* =========================================
       COLISÃO E FÍSICA
     ========================================= */

  /**
   * Verifica se um pixel específico está vazio
   */
  isEmpty(x, y) {
    if (!this._layer1) {
      console.warn("⚠️ Map.isEmpty: layer1 não existe!");
      return true;
    }
    return this._layer1.isEmpty(x, y);
  }

  /**
   * Verifica se um retângulo está vazio
   * Aceita tanto objeto {x, y, width, height} quanto parâmetros separados
   */
  isRectangleEmpty(x, y, width, height) {
    if (!this._layer1) {
      console.warn("⚠️ Map.isRectangleEmpty: layer1 não existe!");
      return true;
    }

    let rect;
    if (typeof x === "object" && x !== null && "x" in x) {
      rect = x;
    } else {
      rect = { x, y, width, height };
    }

    return this._layer1.isRectangleEmptyQuick(rect);
  }

  /**
   * Verifica se a coordenada está fora dos limites do mapa
   */
  isOutMap(x, y) {
    return x < 0 || x >= this._bound.width || y >= this._bound.height;
  }

  /**
   * Lógica para encontrar onde pisar (usado por IAs ou players)
   */
  findYLineNotEmptyPoint(x, y, h) {
    x = x < 0 ? 0 : x >= this._bound.width ? this._bound.width - 1 : x;
    y = y < 0 ? 0 : y;
    if (h === undefined) h = this._bound.height;
    h = y + h >= this._bound.height ? this._bound.height - y - 1 : h;

    for (let i = 0; i < h; i++) {
      if (!this.isEmpty(x - 1, y) || !this.isEmpty(x + 1, y)) {
        return { x: x, y: y };
      }
      y++;
    }
    return null;
  }

  /* =========================================
       PROCURA DE OBJETOS FÍSICOS (COLISÃO ENTRE ENTIDADES)
     ========================================= */

  /**
   * Procura objetos físicos que colidem com um retângulo especificado.
   * @param {object} targetRect - O retângulo (bounding box) global ({x, y, width, height})
   * @param {object} excludeObject - O objeto a ser ignorado (geralmente o próprio projétil)
   * @returns {Array<object>} Lista de objetos que colidiram
   */
  findPhysicalObjects(targetRect, excludeObject) {
    const collidedObjects = [];

    if (!targetRect || typeof targetRect.x === "undefined") {
      console.warn("⚠️ findPhysicalObjects: targetRect inválido", targetRect);
      return collidedObjects;
    }

    // Itera sobre todos os objetos físicos registrados
    for (const phy of this._objects) {
      // Ignora o próprio objeto que está fazendo a checagem
      if (phy === excludeObject) {
        continue;
      }

      // Se o objeto for penetrável, ignora (ex: efeitos visuais)
      if (phy.canPenetrate === true) {
        continue;
      }

      // Verifica se o objeto tem um bounding box válido
      if (!phy.rect) {
        console.warn("⚠️ Objeto físico sem rect:", phy);
        continue;
      }

      const otherRect = phy.rect;

      // Validação de segurança
      if (
        typeof otherRect.x === "undefined" ||
        typeof otherRect.y === "undefined" ||
        typeof otherRect.width === "undefined" ||
        typeof otherRect.height === "undefined"
      ) {
        console.warn("⚠️ otherRect inválido:", otherRect);
        continue;
      }

      // Algoritmo AABB (Axis-Aligned Bounding Box)
      const doesCollide =
        targetRect.x < otherRect.x + otherRect.width &&
        targetRect.x + targetRect.width > otherRect.x &&
        targetRect.y < otherRect.y + otherRect.height &&
        targetRect.y + targetRect.height > otherRect.y;

      if (doesCollide) {
        console.log(`💥 Colisão detectada entre objetos!`, {
          target: targetRect,
          other: otherRect,
        });
        collidedObjects.push(phy);
      }
    }

    return collidedObjects;
  }

  /* =========================================
       MANIPULAÇÃO DE TERRENO
     ========================================= */

  /**
   * Remove terreno (Explosão/Escavação)
   */
  dig(cx, cy, surface, border) {
    if (!this._layer1) {
      console.warn("⚠️ Map.dig: layer1 não existe!");
      return;
    }

    console.log(
      `💣 Escavando em (${cx}, ${cy}) com raio ${surface?.width || 0}`
    );

    this._layer1.dig(cx, cy, surface, border);

    // Se quiser cavar o layer2 também, descomente:
    // if (this._layer2) this._layer2.dig(cx, cy, surface, border);
  }

  /**
   * Adiciona terreno (Blocos, Pontes, Caixas)
   */
  add(cx, cy, surface) {
    if (!this._layer1) {
      console.warn("⚠️ Map.add: layer1 não existe!");
      return;
    }

    if (!this._layer1.add) {
      console.error("❌ Map.add: layer1 não tem método add!");
      return;
    }

    console.log(`🧱 Adicionando terreno em (${cx}, ${cy})`);
    this._layer1.add(cx, cy, surface);
  }

  /* =========================================
       OBJETOS FÍSICOS (Entidades)
     ========================================= */

  /**
   * Adiciona um objeto físico ao mapa (Player, Tank, Caixa, etc)
   */
  addPhysical(phy) {
    if (!phy) {
      console.warn("⚠️ Tentativa de adicionar objeto físico nulo!");
      return;
    }

    console.log(
      `➕ Objeto físico adicionado:`,
      phy.id || phy.name || "sem nome"
    );

    if (phy.setMap) {
      phy.setMap(this);
    }

    this._objects.add(phy);
  }

  /**
   * Remove um objeto físico do mapa
   */
  removePhysical(phy) {
    if (!phy) {
      console.warn("⚠️ Tentativa de remover objeto físico nulo!");
      return;
    }

    console.log(`➖ Objeto físico removido:`, phy.id || phy.name || "sem nome");

    if (phy.setMap) {
      phy.setMap(null);
    }

    this._objects.delete(phy);
  }

  /**
   * Atualiza todos os objetos físicos
   */
  update(dt) {
    for (const phy of this._objects) {
      if (phy.update && typeof phy.update === "function") {
        phy.update(dt);
      }
    }
  }

  /* =========================================
       SPAWN (Pontos de Nascimento)
     ========================================= */

  setSpawnPoints(posStringA, posStringB) {
    this._spawnPoints.teamA = this._parsePoints(posStringA);
    this._spawnPoints.teamB = this._parsePoints(posStringB);
  }

  getSpawnPoint(teamId) {
    const list =
      teamId === 1 ? this._spawnPoints.teamA : this._spawnPoints.teamB;
    if (!list || list.length === 0) return { x: 100, y: 100 };
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  _parsePoints(posString) {
    if (!posString) return [];
    return posString
      .split("|")
      .map((s) => {
        const xy = s.split(",");
        return { x: parseInt(xy[0]), y: parseInt(xy[1]) };
      })
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
  }

  /* =========================================
       LIMPEZA
     ========================================= */

  dispose() {
    console.log("🗑️ Map.dispose() chamado - limpando objetos");
    this._objects.clear();
    this._layer1 = null;
    this._layer2 = null;
  }

  /* =========================================
       DEBUG
     ========================================= */

  debugInfo() {
    console.log("🗺️ MAP DEBUG INFO:");
    console.log(`  Dimensões: ${this._bound.width}x${this._bound.height}`);
    console.log(`  Objetos físicos: ${this._objects.size}`);
    console.log(`  Gravidade: ${this.gravity}`);
    console.log(`  Vento: ${this.wind}`);
    console.log(`  Layer1 existe: ${!!this._layer1}`);
    console.log(`  Layer2 existe: ${!!this._layer2}`);
  }
}
