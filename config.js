// config.js - Central Configuration File

// =============================================================================
// 1. GLOBAL GAME SETTINGS (Physics, UI, Map)
// =============================================================================
export const CONFIG = {
  // 🏃 Movement & Physics
  moveSpeed: 2,
  GRAVITY: 0.3,
  PPI: 120, // Pixels Per Meter
  angleStep: 0.1, // Precision aiming

  // 🗺️ Minimap Configuration
  MINIMAP: {
    WIDTH: 200,
    BORDER_COLOR: "#555",
    BG_COLOR: "rgba(0, 0, 0, 0.5)",
    CAMERA_RECT_COLOR: "rgba(255, 255, 255, 0.8)",
    PLAYER_COLOR: "#adff2f",
    ENEMY_COLOR: "#ff0000",
  },
};

// =============================================================================
// 2. GAME STATE (Runtime Variables)
// =============================================================================
export const GAME_STATE = {
  turn: "player",
  wind: 0,
};

// =============================================================================
// 3. TERRAIN IMPACTS (Destruction Logic)
// =============================================================================
export const IMPACT_TYPES = {
  crater_small: { radius: 30 },
  crater_large: { radius: 80 },
  crater_tunnel: { radius: 20 },
  crater_custom: { radius: 50 },

  LIGHTNING: {
    craterId: "shoq2",
    radius: 20,
    damage: 60,
  },
};

// =============================================================================
// 4. WEAPON DATABASE (Stats & Assets)
// =============================================================================
export const WEAPON_DB = {
  // --- 🚀 STANDARD MISSILE ---
  missile: {
    name: "Míssil Padrão",
    color: "#ffff00",

    // 📊 Stats
    projSize: 4,
    speedMult: 17.0, // [UPDATED] High Speed Base
    minAngle: 20,
    maxAngle: 90,
    impactId: "crater_small",

    // 🎨 Visuals
    spriteId: null,
    weaponSprite: null,

    explosionSprite: {
      id: "explosion_cartoon",
      path: "./sprites/effects/exp3.png",
      frameWidth: 122,
      frameHeight: 126,
      totalFrames: 7,
      fps: 15,
      scale: 0.8,
      duration: 500,
      offsetY: -20,
    },
  },

  // --- ☢️ NUKE ---
  nuke: {
    name: "Nuke (Nuclear)",
    color: "#00ff00",

    // 📊 Stats
    projSize: 6,
    speedMult: 17.0, // [UPDATED] High Speed Base
    minAngle: 20,
    maxAngle: 90,
    impactId: "crater_large",

    // 🎨 Visuals
    spriteId: null,
    weaponSprite: null,

    explosionSprite: {
      id: "explosion_nuke",
      path: "./sprites/effects/exp3.png",
      frameWidth: 122,
      frameHeight: 126,
      totalFrames: 8,
      fps: 12,
      scale: 1.5,
      duration: 800,
      offsetY: -40,
    },
  },

  // --- ⚡ DRILL / ELECTRIC ---
  drill: {
    name: "Escavadeira",
    color: "#00ffff",

    // 📊 Stats
    projSize: 1,
    speedMult: 17.0, // [UPDATED] High Speed Base
    minAngle: 20,
    maxAngle: 90,
    impactId: "LIGHTNING",

    // 🎨 Visuals
    spriteId: null,
    weaponSprite: null,

    explosionSprite: {
      id: "explosion_drill",
      path: "./sprites/effects/shoq.png",
      frameWidth: 352,
      frameHeight: 346,
      totalFrames: 7,
      fps: 24,
      scale: 0.2,
      duration: 333,
    },
  },

  // --- 🍞 CUSTOM (TOASTER) ---
  custom_weapon: {
    name: "Torradeira",
    color: "#ff00ff",

    // 📊 Stats
    projSize: 1,
    speedMult: 17.0, // [KEPT] Already High Speed
    minAngle: 20,
    maxAngle: 90,
    impactId: "LIGHTNING",

    // 🎨 Visuals: Projectile
    spriteId: "_toast",
    sprite: {
      path: "./sprites/toast.png",
      frameWidth: 283,
      frameHeight: 167,
      totalFrames: 6,
      fps: 12,
      scale: 0.2,
    },

    // 🎨 Visuals: Backpack
    weaponSprite: {
      path: "./sprites/weapons/toaster.png",
      offsetX: -15,
      offsetY: -5,
      scale: 0.5,
    },

    // 🎨 Visuals: Explosion
    explosionSprite: {
      id: "explosion_toaster",
      path: "./sprites/effects/shoq.png",
      frameWidth: 352,
      frameHeight: 346,
      totalFrames: 7,
      fps: 20,
      scale: 0.6,
      duration: 400,
    },
  },
};
