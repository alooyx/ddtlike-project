// config.js - Configurações do jogo

export const IMPACT_TYPES = {
  crater_small: { radius: 30 },
  crater_large: { radius: 80 },
  crater_tunnel: { radius: 20 },
  crater_custom: { radius: 50 },
};

export const WEAPON_DB = {
  missile: {
    name: "Míssil",
    color: "#ffff00",
    projSize: 4,
    speedMult: 2.5,
    impactId: "crater_small",
    spriteId: null,
    weaponSprite: null,
    // 💥 Explosão
    explosionSprite: {
      id: "explosion_small",
      path: "./sprites/effects/explosion.png",
      frameWidth: 496,
      frameHeight: 566,
      totalFrames: 8,
      fps: 20,
      scale: 0.15,
      duration: 400,
    },
  },
  nuke: {
    name: "Nuke",
    color: "#00ff00",
    projSize: 6,
    speedMult: 2.0,
    impactId: "crater_large",
    spriteId: null,
    weaponSprite: null,
    explosionSprite: {
      id: "explosion_large",
      path: "./sprites/effects/explosion.png",
      frameWidth: 496,
      frameHeight: 566,
      totalFrames: 8,
      fps: 20,
      scale: 0.3,
      duration: 400,
    },
  },
  drill: {
    name: "Escavadeira",
    color: "#00ffff",
    projSize: 10,
    speedMult: 1.0,
    impactId: "crater_tunnel",
    spriteId: null,
    weaponSprite: null,
    explosionSprite: {
      id: "explosion_drill",
      path: "./sprites/effects/shoq.png",
      frameWidth: 352,
      frameHeight: 346,
      totalFrames: 7,
      fps: 30,
      scale: 0.4,
      duration: 333,
    },
  },
  custom_weapon: {
    name: "Toaster",
    color: "#ff00ff",
    projSize: 2,
    speedMult: 1.2,
    impactId: "crater_custom",
    spriteId: "_toast",
    sprite: {
      path: "./sprites/toast.png",
      frameWidth: 283,
      frameHeight: 167,
      totalFrames: 6,
      fps: 10,
      scale: 0.3,
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
      fps: 15,
      scale: 0.5,
      duration: 400,
    },
  },
};

export const CONFIG = {
  moveSpeed: 2,
};

export const GAME_STATE = {
  turn: "player",
};

//frameWidth: 122,
//   frameHeight: 126,
