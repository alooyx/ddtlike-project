// Maps/Tile.js - VERSÃO CORRIGIDA

export class Tile {
  constructor(data, width, height, digable) {
    this._width = width;
    this._height = height;
    this._digable = digable;
    this._bw = Math.floor(this._width / 8) + 1;
    this._bh = this._height;
    this._rect = { x: 0, y: 0, width: this._width, height: this._height };

    if (data) {
      this._data = data;
    } else {
      this._data = new Uint8Array(this._bw * this._bh);
    }
  }

  get bound() {
    return this._rect;
  }
  get data() {
    return this._data;
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }

  static createEmpty(width, height, digable) {
    return new Tile(null, width, height, digable);
  }

  static createCircleTile(radius, digable = true) {
    const width = radius * 2;
    const height = radius * 2;
    const tile = new Tile(null, width, height, digable);
    const cx = radius;
    const cy = radius;
    const r2 = radius * radius;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          const index = y * tile._bw + (x >> 3);
          const bit = 7 - (x % 8);
          tile._data[index] |= 1 << bit;
        }
      }
    }
    return tile;
  }

  static createRectTile(width, height, digable = true) {
    const tile = new Tile(null, width, height, digable);
    tile._data.fill(255);
    return tile;
  }

  add(x, y, tile) {
    const addData = tile.data;
    let rect = { ...tile.bound };
    rect.x += x;
    rect.y += y;
    rect = this.intersectRect(rect, this._rect);

    if (rect.width !== 0 && rect.height !== 0) {
      rect.x -= x;
      rect.y -= y;

      const cx = Math.floor(rect.x / 8);
      const cx2 = Math.floor((rect.x + x) / 8);
      const cy = rect.y;
      let cw = Math.floor(rect.width / 8) + 1;
      const ch = rect.height;

      if (rect.x === 0) {
        if (cw + cx2 < this._bw) {
          cw++;
          if (cw > tile._bw) cw = tile._bw;
        }
      }

      const b_offset = (rect.x + x) % 8;
      let self_offset, tile_offset;
      let r_bits, l_bits;
      let src, target;

      for (let j = 0; j < ch; j++) {
        r_bits = 0;
        l_bits = 0;
        for (let i = 0; i < cw; i++) {
          self_offset = (j + y + cy) * this._bw + i + cx2;
          tile_offset = (j + cy) * tile._bw + i + cx;

          if (tile_offset < addData.length) src = addData[tile_offset];
          else src = 0;

          l_bits = src << b_offset;

          if (i < cw - 1 && tile_offset + 1 < addData.length) {
            src = addData[tile_offset + 1];
            r_bits = src >> (8 - b_offset);
          } else {
            r_bits = 0;
          }

          if (self_offset < this._data.length) {
            target = this._data[self_offset];
            target |= l_bits;
            if (r_bits !== 0) {
              target |= r_bits;
            }
            this._data[self_offset] = target & 0xff;
          }
        }
      }
    }
  }

  dig(cx, cy, surface, border) {
    if (this._digable && surface) {
      let x1 = Math.floor(cx - surface.width / 2);
      let y1 = Math.floor(cy - surface.height / 2);
      this.remove(x1, y1, surface);

      if (border) {
        x1 = Math.floor(cx - border.width / 2);
        y1 = Math.floor(cy - border.height / 2);
      }
    }
  }

  remove(x, y, tile) {
    const addData = tile.data;
    let rect = { ...tile.bound };
    rect.x += x;
    rect.y += y;
    rect = this.intersectRect(rect, this._rect);

    if (rect.width !== 0 && rect.height !== 0) {
      rect.x -= x;
      rect.y -= y;

      const cx = Math.floor(rect.x / 8);
      const cx2 = Math.floor((rect.x + x) / 8);
      const cy = rect.y;
      let cw = Math.floor(rect.width / 8) + 1;
      const ch = rect.height;

      if (rect.x === 0) {
        if (cw + cx2 < this._bw) {
          cw++;
          if (cw > tile._bw) cw = tile._bw;
        }
      }

      const b_offset = (rect.x + x) % 8;
      let self_offset = 0;
      let tile_offset = 0;
      let r_bits = 0;
      let l_bits = 0;
      let src = 0;
      let target = 0;

      for (let j = 0; j < ch; j++) {
        r_bits = 0;
        l_bits = 0;
        for (let i = 0; i < cw; i++) {
          self_offset = (j + y + cy) * this._bw + i + cx2;
          tile_offset = (j + cy) * tile._bw + i + cx;

          if (tile_offset < addData.length) {
            src = addData[tile_offset];
          } else {
            src = 0;
          }

          l_bits = src << b_offset;

          if (i < cw - 1 && tile_offset + 1 < addData.length) {
            src = addData[tile_offset + 1];
            r_bits = src >> (8 - b_offset);
          } else {
            r_bits = 0;
          }

          if (self_offset < this._data.length) {
            target = this._data[self_offset];
            target &= ~(target & l_bits);
            if (r_bits !== 0) {
              target &= ~(target & r_bits);
            }
            this._data[self_offset] = target & 0xff;
          }
        }
      }
    }
  }

  isEmpty(x, y) {
    if (x >= 0 && x < this._width && y >= 0 && y < this._height) {
      const index = y * this._bw + (x >> 3);
      const flag = 1 << (7 - (x % 8));
      return (this._data[index] & flag) === 0;
    } else {
      return true;
    }
  }

  isYLineEmpty(x, y, h) {
    if (x >= 0 && x < this._width) {
      y = y < 0 ? 0 : y;
      h = y + h > this._height ? this._height - y : h;

      for (let i = 0; i < h; i++) {
        if (!this.isEmpty(x, y + i)) return false;
      }
      return true;
    }
    return true;
  }

  // 🔧 CORREÇÃO CRÍTICA: Aceitar tanto objeto quanto parâmetros separados
  isRectangleEmptyQuick(x, y, width, height) {
    let rect;

    // Se x é um objeto com propriedades x, y, width, height
    if (typeof x === "object" && x !== null && "x" in x) {
      rect = x;
    } else {
      // Se são parâmetros separados
      rect = { x, y, width, height };
    }

    const iRect = this.intersectRect(rect, this._rect);
    const right = iRect.x + iRect.width - 1;
    const bottom = iRect.y + iRect.height - 1;

    // Verifica os 4 cantos do retângulo
    if (
      this.isEmpty(right, bottom) &&
      this.isEmpty(iRect.x, bottom) &&
      this.isEmpty(right, iRect.y) &&
      this.isEmpty(iRect.x, iRect.y)
    ) {
      return true;
    }
    return false;
  }

  findNotEmptyPoint(x, y, h) {
    if (x >= 0 && x < this._width) {
      y = y < 0 ? 0 : y;
      h = y + h > this._height ? this._height - y : h;

      for (let i = 0; i < h; i++) {
        if (!this.isEmpty(x, y + i)) {
          return { x: x, y: y + i };
        }
      }
    }
    return { x: -1, y: -1 };
  }

  clone() {
    const newData = new Uint8Array(this._data);
    return new Tile(newData, this._width, this._height, this._digable);
  }

  intersectRect(r1, r2) {
    const x1 = Math.max(r1.x, r2.x);
    const y1 = Math.max(r1.y, r2.y);
    const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
    const y2 = Math.min(r1.y + r1.height, r2.y + r2.height);

    if (x2 >= x1 && y2 >= y1) {
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    } else {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
  }
}
