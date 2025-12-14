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
    this.craterTiles = new Map(); // 🕳️ Cache dos moldes de física (bits)
    this.craterImages = new Map(); // 🖼️ Cache das imagens originais (visual)
  }

  // 💥 Pré-carrega sprites de explosão E crateras personalizadas
  async preloadExplosions() {
    console.log("💥 Pré-carregando explosões e crateras...");

    // 1. Sprites de Explosão (Animações)
    for (const [weaponId, weaponData] of Object.entries(WEAPON_DB)) {
      if (weaponData.explosionSprite) {
        const config = weaponData.explosionSprite;

        if (!this.explosionSprites.has(config.id)) {
          const spriteSheet = new SpriteSheet(
            config.path,
            config.frameWidth,
            config.frameHeight,
            config.totalFrames,
            config.fps
          );

          await spriteSheet.load();
          this.explosionSprites.set(config.id, spriteSheet);
          this.spriteManager.register(config.id, spriteSheet);

          console.log(`✅ Explosão ${config.id} pré-carregada`);
        }
      }
    }

    // 2. Imagens de Cratera (Buracos Personalizados)
    for (const [key, data] of Object.entries(IMPACT_TYPES)) {
      if (data.craterId) {
        // Assume que as crateras estão na pasta sprites/
        const path = `./sprites/${data.craterId}.png`;

        try {
          const img = await this.loadImage(path);

          // Cria a física (Tile) a partir da imagem
          const tile = this.createTileFromImage(img);

          this.craterTiles.set(key, tile);
          this.craterImages.set(key, img); // Salva para o visual

          console.log(`✅ Cratera carregada: ${key} (${path})`);
        } catch (err) {
          console.error(`❌ Erro ao carregar cratera ${path}:`, err);
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

    // --------------------------------------------------------
    // 1. FÍSICA (CAVAR)
    // --------------------------------------------------------
    let shape;

    // Se tiver um molde personalizado carregado, usa ele
    if (this.craterTiles.has(impactId)) {
      shape = this.craterTiles.get(impactId);
    } else {
      // Fallback: Círculo padrão
      shape = Tile.createCircleTile(data.radius);
    }

    this.gameMap.dig(x, y, shape);

    // --------------------------------------------------------
    // 2. VISUAL (CANVAS)
    // --------------------------------------------------------
    this.terrainCtx.save();
    this.terrainCtx.globalCompositeOperation = "destination-out"; // Modo Borracha

    if (this.craterImages.has(impactId)) {
      // Desenha a imagem irregular para apagar visualmente
      const img = this.craterImages.get(impactId);
      const drawX = x - img.width / 2;
      const drawY = y - img.height / 2;

      this.terrainCtx.drawImage(img, drawX, drawY);
    } else {
      // Fallback: Desenha o círculo
      this.terrainCtx.beginPath();
      this.terrainCtx.arc(x, y, data.radius, 0, Math.PI * 2);
      this.terrainCtx.fill();
    }

    this.terrainCtx.restore();

    console.log(
      `✅ Explosão aplicada: ${impactId} em (${Math.floor(x)}, ${Math.floor(
        y
      )})`
    );
  }

  // 💥 Cria explosão visual (SÍNCRONO)
  createExplosion(x, y, explosionConfig) {
    let spriteSheet = this.explosionSprites.get(explosionConfig.id);

    if (!spriteSheet) {
      spriteSheet = this.spriteManager.get(explosionConfig.id);
    }

    if (!spriteSheet || !spriteSheet.loaded) {
      console.warn(
        `⚠️ Explosão ${explosionConfig.id} não carregada! Pulando animação.`
      );
      return;
    }

    const explosion = this.world.createEntity();

    this.world.addComponent(
      explosion,
      "position",
      Position(Math.floor(x), Math.floor(y))
    );

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
  }

  // ========================================================
  // 🛠️ HELPERS (Carregamento de Imagem -> Tile)
  // ========================================================

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  createTileFromImage(img) {
    const w = img.width;
    const h = img.height;

    // Canvas temporário para ler pixels
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    // Cria Tile vazio (Classe Tile deve ter createEmpty)
    const tile = Tile.createEmpty(w, h, true);
    const data = tile.data;

    // Calcula stride (largura em bytes)
    // Se Tile.js usa _bw interno, assumimos a lógica padrão:
    const stride = Math.floor(w / 8) + 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const alpha = pixels[i + 3];

        // Se pixel visível (>50 alpha), marca como sólido (1)
        if (alpha > 50) {
          const idx = y * stride + (x >> 3);
          const bit = 7 - (x % 8);
          data[idx] |= 1 << bit;
        }
      }
    }
    return tile;
  }
}
