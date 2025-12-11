// systems/TerrainSystem.js - Sistema de Terreno e Explosões

import { IMPACT_TYPES, WEAPON_DB } from "../../config.js";
import {
  Position,
  SpriteRenderable,
  ExplosionComponent,
} from "../../components.js";
import { Tile } from "../../Maps/Tile.js";
import { SpriteSheet, SpriteAnimation } from "../../js/SpriteManager.js";

export class TerrainSystem {
  constructor(gameMap, terrainCtx, world, spriteManager) {
    this.gameMap = gameMap;
    this.terrainCtx = terrainCtx;
    this.world = world;
    this.spriteManager = spriteManager;
    this.explosionSprites = new Map(); // 💥 Cache de sprites carregadas
  }

  // 💥 Pré-carrega sprites de explosão
  async preloadExplosions() {
    console.log("💥 Pré-carregando explosões...");

    for (const [weaponId, weaponData] of Object.entries(WEAPON_DB)) {
      if (weaponData.explosionSprite) {
        const config = weaponData.explosionSprite;

        // Verifica se já foi carregada
        if (!this.explosionSprites.has(config.id)) {
          const spriteSheet = new SpriteSheet(
            config.path,
            config.frameWidth,
            config.frameHeight,
            config.totalFrames,
            config.fps
          );

          // Carrega AGORA (não assíncrono)
          await spriteSheet.load();

          this.explosionSprites.set(config.id, spriteSheet);
          this.spriteManager.register(config.id, spriteSheet);

          console.log(`✅ Explosão ${config.id} pré-carregada`);
        }
      }
    }
  }

  applyImpact(x, y, impactId, weaponId) {
    // 💥 ORDEM CORRETA: Cria explosão ANTES de cavar
    const weaponStats = WEAPON_DB[weaponId];
    if (weaponStats && weaponStats.explosionSprite) {
      this.createExplosion(x, y, weaponStats.explosionSprite);
    }

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

    console.log(
      `✅ Explosão aplicada: raio ${data.radius}px em (${Math.floor(
        x
      )}, ${Math.floor(y)})`
    );
  }

  // 💥 Cria explosão visual (SÍNCRONO)
  createExplosion(x, y, explosionConfig) {
    console.log(
      `💥 Criando explosão INSTANTÂNEA em (${Math.floor(x)}, ${Math.floor(y)})`
    );

    // Usa sprite já carregada do cache
    let spriteSheet = this.explosionSprites.get(explosionConfig.id);

    if (!spriteSheet) {
      // Fallback: tenta pegar do spriteManager
      spriteSheet = this.spriteManager.get(explosionConfig.id);
    }

    if (!spriteSheet || !spriteSheet.loaded) {
      console.warn(
        `⚠️ Explosão ${explosionConfig.id} não carregada! Pulando animação.`
      );
      return;
    }

    // Cria entidade de explosão NO MESMO FRAME
    const explosion = this.world.createEntity();

    // 💥 POSIÇÃO EXATA onde o projétil colidiu
    this.world.addComponent(
      explosion,
      "position",
      Position(Math.floor(x), Math.floor(y))
    );

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

    console.log(
      `✅ Explosão criada IMEDIATAMENTE em (${Math.floor(x)}, ${Math.floor(y)})`
    );
  }
}
