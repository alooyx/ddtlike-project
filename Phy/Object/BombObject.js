// Phy/Object/BombObject.js - VERSÃO CORRIGIDA

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

    // Vetores de Euler para física (posição, velocidade, aceleração)
    this.m_vx = new EulerVector(0, 0, 0);
    this.m_vy = new EulerVector(0, 0, 0);

    // Define o bounding box centralizado
    this.setRect(-(width / 2), -(height / 2), width, height);

    // Fatores calculados (Air Resistance, Gravity, Wind)
    this.arf = 0;
    this.gf = 0;
    this.wf = 0;

    this.isMoving = true;
    this.isLiving = true;

    console.log(
      `🚀 BombObject criado: ID=${id}, mass=${mass}, size=${width}x${height}`
    );
  }

  /* =========================================
         GETTERS DE VELOCIDADE
     ========================================= */

  get vX() {
    return this.m_vx.x1;
  }

  get vY() {
    return this.m_vy.x1;
  }

  /* =========================================
         CONFIGURAÇÃO INICIAL
     ========================================= */

  setSpeedXY(vx, vy) {
    this.m_vx.x1 = vx;
    this.m_vy.x1 = vy;
    console.log(
      `🎯 Velocidade inicial: vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}`
    );
  }

  setXY(x, y) {
    if (super.setXY) super.setXY(x, y);
    else {
      this.x = x;
      this.y = y;
    }

    this.m_vx.x0 = x;
    this.m_vy.x0 = y;
  }

  setMap(map) {
    if (super.setMap) super.setMap(map);
    else this.map = map;

    this.updateAGW();
  }

  /* =========================================
         FÍSICA - FATORES DE FORÇA
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
      `⚙️ Fatores de física: air=${this.arf.toFixed(3)}, grav=${this.gf.toFixed(
        3
      )}, wind=${this.wf.toFixed(3)}`
    );
  }

  /* =========================================
         FÍSICA - INTEGRAÇÃO DE EULER
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
         LOOP DE ATUALIZAÇÃO PRINCIPAL
     ========================================= */

  update() {
    if (!this.isMoving) return;

    // DT fixo para estabilidade
    const dt = 0.1;

    // 1. Calcula o próximo ponto baseado na física
    const nextPoint = this.completeNextMovePoint(dt);

    // 2. Move tentando chegar lá (verifica colisões no caminho)
    this.moveTo(nextPoint.x, nextPoint.y);
  }

  /* =========================================
         MOVIMENTO COM RAYCAST
     ========================================= */

  moveTo(px, py) {
    if (px === this.x && py === this.y) return;

    const dx = px - this.x;
    const dy = py - this.y;
    let count = 0;
    let dtStep = 1;
    let useX = true;

    // Determina qual eixo tem maior movimento
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

    // Raycast: Verifica colisão pixel por pixel ao longo do trajeto
    for (let i = 1; i <= count; i += 2) {
      // i += 2 para otimização (a cada 2 pixels)
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

      // --- VERIFICAÇÃO 1: COLISÃO COM OBJETOS FÍSICOS ---
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
        console.log(`💥 Bomba colidiu com ${list.length} objeto(s) físico(s)`);
        this.setXY(dest.x, dest.y);
        this.collideObjects(list);
        if (!this.isLiving || !this.isMoving) return;
      }

      // --- VERIFICAÇÃO 2: COLISÃO COM TERRENO ---
      else if (this.map && this.map.ground) {
        const checkX = Math.floor(dest.x);
        const checkY = Math.floor(dest.y);

        // Verifica um quadrado 3x3 ao redor da posição
        const hitsTerrain = !this.map.ground.isRectangleEmptyQuick(
          checkX - 1,
          checkY - 1,
          3,
          3
        );

        if (hitsTerrain) {
          console.log(`🎯 Bomba colidiu com terreno em (${checkX}, ${checkY})`);
          this.setXY(dest.x, dest.y);
          this.collideGround();
          return;
        }
      }

      // --- VERIFICAÇÃO 3: SAIU DO MAPA ---
      else if (
        this.map &&
        this.map.isOutMap &&
        this.map.isOutMap(dest.x, dest.y)
      ) {
        console.log(
          `🌊 Bomba saiu do mapa em (${Math.floor(dest.x)}, ${Math.floor(
            dest.y
          )})`
        );
        this.setXY(dest.x, dest.y);
        this.flyoutMap();
        return;
      }
    }

    // Se chegou aqui, não colidiu com nada - atualiza a posição
    this.setXY(px, py);
  }

  /* =========================================
         HANDLERS DE COLISÃO
     ========================================= */

  collideObjects(list) {
    console.log("💥 collideObjects chamado");
    this.stopMoving();
    this.die();
  }

  collideGround() {
    console.log("💥 collideGround chamado");
    this.stopMoving();
    this.die();
  }

  flyoutMap() {
    console.log("🌊 flyoutMap chamado");
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
         GEOMETRIA - INTERPOLAÇÃO LINEAR
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
