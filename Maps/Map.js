// Maps/Map.js - VERSÃO DEFINITIVA COM SETTERS

export class Map {
  constructor(info, layer1, layer2) {
    this._info = info || {};
    this._wind = 0;
    this._objects = new Set();
    this._layer1 = layer1; // Camada de Chão (Tile)
    this._layer2 = layer2; // Camada de Objetos (Tile)

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
          GETTERS & SETTERS (AQUI ESTÁ A CORREÇÃO)
     ========================================= */

  // ✅ Getter e Setter para WIDTH
  get width() {
    return this._bound.width;
  }
  set width(val) {
    this._bound.width = val;
  }

  // ✅ Getter e Setter para HEIGHT
  get height() {
    return this._bound.height;
  }
  set height(val) {
    this._bound.height = val;
  }

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

  isSolid(x, y) {
    if (this.isOutMap(x, y)) return false;
    if (!this._layer1) return false;
    return !this._layer1.isEmpty(x, y);
  }

  isEmpty(x, y) {
    if (this.isOutMap(x, y)) return true;
    if (!this._layer1) return true;
    return this._layer1.isEmpty(x, y);
  }

  isRectangleEmpty(x, y, width, height) {
    if (!this._layer1) return true;
    let rect;
    if (typeof x === "object" && x !== null && "x" in x) {
      rect = x;
    } else {
      rect = { x, y, width, height };
    }
    return this._layer1.isRectangleEmptyQuick(
      rect.x,
      rect.y,
      rect.width,
      rect.height
    );
  }

  isOutMap(x, y) {
    // return x < 0 || x >= this._bound.width || y < -2000;

    return (
      x < -100 || x >= this._bound.width + 100 || y > this._bound.height + 500
    );
  }

  /* =========================================
        PROCURA DE OBJETOS
     ========================================= */

  findPhysicalObjects(targetRect, excludeObject) {
    const collidedObjects = [];
    if (!targetRect) return collidedObjects;

    for (const phy of this._objects) {
      if (phy === excludeObject) continue;
      if (phy.canPenetrate === true) continue;
      if (!phy.rect) continue;

      const otherRect = phy.rect;

      const doesCollide =
        targetRect.x < otherRect.x + otherRect.width &&
        targetRect.x + targetRect.width > otherRect.x &&
        targetRect.y < otherRect.y + otherRect.height &&
        targetRect.y + targetRect.height > otherRect.y;

      if (doesCollide) {
        collidedObjects.push(phy);
      }
    }
    return collidedObjects;
  }

  /* =========================================
        TERRENO E ENTIDADES
     ========================================= */

  dig(cx, cy, surface, border) {
    if (!this._layer1) return;
    this._layer1.dig(cx, cy, surface, border);
  }

  add(cx, cy, surface) {
    if (!this._layer1 || !this._layer1.add) return;
    this._layer1.add(cx, cy, surface);
  }

  addPhysical(phy) {
    if (!phy) return;
    if (phy.setMap) phy.setMap(this);
    this._objects.add(phy);
  }

  removePhysical(phy) {
    if (!phy) return;
    if (phy.setMap) phy.setMap(null);
    this._objects.delete(phy);
  }

  update(dt) {
    for (const phy of this._objects) {
      if (phy.update) phy.update(dt);
    }
  }

  findYLineNotEmptyPoint(x, y, h) {
    x = Math.max(0, Math.min(x, this._bound.width - 1));
    y = Math.max(0, y);
    if (h === undefined) h = this._bound.height;

    for (let i = 0; i < h; i++) {
      if (!this.isEmpty(x - 1, y) || !this.isEmpty(x + 1, y)) {
        return { x: x, y: y };
      }
      y++;
      if (y >= this._bound.height) break;
    }
    return null;
  }

  dispose() {
    this._objects.clear();
    this._layer1 = null;
    this._layer2 = null;
  }
}
