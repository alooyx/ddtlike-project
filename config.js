// config.js - Configurações de Gameplay e Assets

export const IMPACT_TYPES = {
  crater_small: { radius: 30 },
  crater_large: { radius: 80 }, // Nuke faz um buraco enorme
  crater_tunnel: { radius: 20 }, // Escavadeira faz túnel fino
  crater_custom: { radius: 50 },
  LIGHTNING: {
    craterId: "crater_lightning", // O nome do arquivo (sem .png) que definimos no TerrainSystem
    radius: 60, // Fallback caso a imagem falhe
    damage: 60,
  },
};

export const WEAPON_DB = {
  missile: {
    name: "Míssil Padrão",
    color: "#ffff00",
    projSize: 4,
    speedMult: 2.5,
    impactId: "crater_small",
    spriteId: null,
    weaponSprite: null,

    // 💥 EXPLOSÃO ESTILO DDTANK
    explosionSprite: {
      id: "explosion_cartoon",
      // ⚠️ Certifique-se que este arquivo é aquele que alinhamos!
      path: "./sprites/explosion.png",

      // ⚠️ AJUSTE AQUI SE SUA IMAGEM FOR DIFERENTE:
      // Se sua imagem tem 3968px largura / 8 frames = 496
      frameWidth: 496,
      frameHeight: 566,
      totalFrames: 8,

      // CONFIGURAÇÃO ARCADE:
      fps: 15, // Mais lento = Mais dramático (Peso)
      scale: 0.8, // Grande! Para esconder o buraco e dar impacto
      duration: 500, // Tempo de segurança

      // Ajuste fino do centro (se precisar subir ou descer a arte)
      offsetY: -20,
    },
  },

  nuke: {
    name: "Nuke (Nuclear)",
    color: "#00ff00",
    projSize: 6,
    speedMult: 2.0,
    impactId: "crater_large",
    spriteId: null,
    weaponSprite: null,

    explosionSprite: {
      id: "explosion_nuke",
      path: "./sprites/explosion.png", // Pode usar a mesma sprite, só muda a cor/tamanho
      frameWidth: 496,
      frameHeight: 566,
      totalFrames: 8,

      fps: 12, // Nuke é pesada, explode devagar
      scale: 1.5, // GIGANTE (150% do tamanho)
      duration: 800,
      offsetY: -40,
    },
  },

  drill: {
    name: "Escavadeira",
    color: "#00ffff",
    projSize: 3, // Projetil menor para cavar melhor
    speedMult: 3.0,
    impactId: "LIGHTNING",
    spriteId: null,
    weaponSprite: null,

    // Explosão elétrica/choque
    explosionSprite: {
      id: "explosion_drill",
      path: "./sprites/effects/shoq.png", // Verifique se este arquivo existe
      frameWidth: 352,
      frameHeight: 346,
      totalFrames: 7,
      fps: 24, // Elétrico é rápido!
      scale: 0.6,
      duration: 333,
    },
  },

  custom_weapon: {
    name: "Torradeira",
    color: "#ff00ff",
    projSize: 8,
    speedMult: 32.0,
    impactId: "LIGHTNING",
    spriteId: "_toast", // ID do projétil voando (torrada)

    sprite: {
      path: "./sprites/toast.png",
      frameWidth: 283,
      frameHeight: 167,
      totalFrames: 6,
      fps: 12,
      scale: 0.2, // Torrada voando pequena
    },

    weaponSprite: {
      path: "./sprites/weapons/toaster.png",
      offsetX: -15,
      offsetY: -5,
      scale: 0.5,
    },

    explosionSprite: {
      id: "explosion_toaster",
      path: "./sprites/effects/shoq.png",
      frameWidth: 352,
      frameHeight: 346,
      totalFrames: 7,
      fps: 20,
      scale: 0.8,
      duration: 400,
    },
  },
};

export const CONFIG = {
  moveSpeed: 2,
  PPI: 100,
  GRAVITY: 0.15,
  MINIMAP: {
    WIDTH: 200, // Width in pixels on screen
    BORDER_COLOR: "#555",
    BG_COLOR: "rgba(0, 0, 0, 0.5)",
    CAMERA_RECT_COLOR: "rgba(255, 255, 255, 0.8)",
    PLAYER_COLOR: "#adff2f", // Green/Yellow like the tank
    ENEMY_COLOR: "#ff0000", // Red for future enemies
  },
};

export const GAME_STATE = {
  turn: "player",
  wind: 0,
};
