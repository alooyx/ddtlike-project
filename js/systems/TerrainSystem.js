// systems/TerrainSystem.js - Sistema de Terreno e Explosões
import { IMPACT_TYPES, WEAPON_DB } from "../../config.js";
import {
  Position,
  SpriteRenderable,
  ExplosionComponent,
} from "../../components.js";
import { Tile } from "../../Maps/Tile.js";

import { SpriteSheet, SpriteAnimation } from "../SpriteManager.js";

export class TerrainSystem {
  constructor(gameMap, terrainCtx, world, spriteManager) {
    this.gameMap = gameMap;
    this.terrainCtx = terrainCtx;
    this.world = world;
    this.spriteManager = spriteManager;
  }

  applyImpact(x, y, impactId, weaponId) {
    console.log(
      `💥 TerrainSystem.applyImpact em (${Math.floor(x)}, ${Math.floor(
        y
      )}) tipo: ${impactId}`
    );

    const data = IMPACT_TYPES[impactId];
    if (!data) {
      console.error(`❌ ImpactType não encontrado: ${impactId}`);
      return;
    }

    // Cava o terreno
    const shape = Tile.createCircleTile(data.radius);
    this.gameMap.dig(x, y, shape);

    // Atualiza o canvas visual
    this.terrainCtx.save();
    this.terrainCtx.globalCompositeOperation = "destination-out";
    this.terrainCtx.beginPath();
    this.terrainCtx.arc(x, y, data.radius, 0, Math.PI * 2);
    this.terrainCtx.fill();
    this.terrainCtx.restore();

    console.log(`✅ Explosão aplicada: raio ${data.radius}px`);

    // 💥 CRIA ENTIDADE DE EXPLOSÃO
    const weaponStats = WEAPON_DB[weaponId];
    if (weaponStats && weaponStats.explosionSprite) {
      this.createExplosion(x, y, weaponStats.explosionSprite);
    }
  }

  // 💥 Cria explosão visual
  createExplosion(x, y, explosionConfig) {
    console.log(`💥 Criando explosão em (${x}, ${y})`);

    // Carrega sprite se ainda não foi carregada
    let spriteSheet = this.spriteManager.get(explosionConfig.id);

    if (!spriteSheet) {
      // Registra a sprite de explosão
      spriteSheet = new SpriteSheet(
        explosionConfig.path,
        explosionConfig.frameWidth,
        explosionConfig.frameHeight,
        explosionConfig.totalFrames,
        explosionConfig.fps
      );

      // Carrega assíncrono
      spriteSheet.load().then(() => {
        console.log(`✅ Sprite de explosão carregada: ${explosionConfig.id}`);
      });

      this.spriteManager.register(explosionConfig.id, spriteSheet);
    }

    // Cria entidade de explosão
    const explosion = this.world.createEntity();

    this.world.addComponent(explosion, "position", Position(x, y));

    // Animação que NÃO loopa
    const animation = new SpriteAnimation(spriteSheet, false);

    this.world.addComponent(
      explosion,
      "renderable",
      SpriteRenderable(animation, explosionConfig.scale)
    );

    this.world.addComponent(
      explosion,
      "explosion",
      ExplosionComponent(explosionConfig.duration)
    );

    console.log(`✅ Explosão criada com duração ${explosionConfig.duration}ms`);
  }
}
