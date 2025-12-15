// game.js - Core principal do jogo

import { WEAPON_DB, GAME_STATE } from "./config.js";
import {
  Position,
  Renderable,
  PlayerControl,
  CameraFocus,
  Body,
} from "./components.js";
import { World } from "./World.js";
import { InputSystem } from "./js/systems/InputSystem.js";
import { PhysicsSystem } from "./Phy/physics.js";
import { RenderSystem } from "./js/systems/RenderSystem.js";
import { TerrainSystem } from "./js/systems/TerrainSystem.js";
import { CamSystem } from "./js/systems/CamSystem.js";
// ✅ CRITICAL FIX: Importing SpriteAnimation from your file
import { SpriteManager, SpriteAnimation } from "./js/SpriteManager.js";
import { MapLoader } from "./js/MapLoader.js";

export class Game {
  constructor() {
    this.mainCanvas = document.getElementById("gameCanvas");
    this.ctx = this.mainCanvas.getContext("2d");
    this.terrainCanvas = document.createElement("canvas");
    this.tCtx = this.terrainCanvas.getContext("2d");

    this.world = new World();
    this.spriteManager = new SpriteManager();
    this.gameMap = null;

    this.inputSys = null;
    this.physicsSys = null;
    this.renderSys = null;
    this.terrainSys = null;
    this.camSys = null;

    this.isRunning = false;

    console.log("🎮 === GAME INICIALIZADO ===");
  }

  async init() {
    try {
      console.log("⏳ Carregando recursos...");

      // 1. Carrega sprites (Armas + Personagem)
      await this.loadSprites();

      // 2. Carrega Background
      // Ensure this file exists, or comment it out if testing without background
      this.bgImage = await this.loadImage("./ice-bg.png").catch(() => null);

      // [NEW] Load UI Asset (Rule)
      this.ruleImage = await this.loadImage("./ruler.png");

      // 3. Carrega mapa
      await this.loadMap();

      // 4. Inicializa sistemas
      this.initSystems();

      // 5. Pré-carrega explosões
      await this.terrainSys.preloadExplosions();

      // 6. Cria entidades
      this.createInitialEntities();

      // 7. Configura UI
      this.setupUI();

      console.log("✅ Jogo pronto!\n");
      return true;
    } catch (err) {
      console.error("❌ ERRO ao inicializar:", err);
      return false;
    }
  }

  async loadSprites() {
    console.log("🎨 Carregando sprites...");

    // ✅ LOAD CHARACTER
    await this.spriteManager.loadAndRegister(
      "player_char", // ID
      "./character_asset/base_character.png", // Path
      0, // Frame Width (Check your image size!)
      0, // Frame Height
      1, // Total Frames (1 = Static)
      0 // FPS
    );

    // ✅ LOAD WEAPONS
    const spritesToLoad = [];
    const loadedIDs = new Set();

    for (const [weaponId, weaponData] of Object.entries(WEAPON_DB)) {
      if (weaponData.spriteId && weaponData.sprite) {
        if (!loadedIDs.has(weaponData.spriteId)) {
          spritesToLoad.push({
            id: weaponData.spriteId,
            path: weaponData.sprite.path,
            frameWidth: weaponData.sprite.frameWidth,
            frameHeight: weaponData.sprite.frameHeight,
            totalFrames: weaponData.sprite.totalFrames,
            fps: weaponData.sprite.fps || 10,
          });
          loadedIDs.add(weaponData.spriteId);
        }
      }
    }

    if (spritesToLoad.length > 0) {
      try {
        await this.spriteManager.loadMultiple(spritesToLoad);
        console.log(`✅ ${spritesToLoad.length} armas carregadas.`);
      } catch (err) {
        console.warn("⚠️ Erro ao carregar armas:", err);
      }
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async loadMap() {
    console.log("🗺️ Carregando mapa...");
    const resultado = await MapLoader.loadFromImage("./ice.png"); //
    const { mapInstance, mapImage } = resultado;

    this.mainCanvas.width = 1600;
    this.mainCanvas.height = 900;
    this.terrainCanvas.width = mapInstance.bound.width;
    this.terrainCanvas.height = mapInstance.bound.height;
    this.tCtx.drawImage(mapImage, 0, 0);
    this.gameMap = mapInstance;
  }

  initSystems() {
    console.log("⚙️ Inicializando sistemas...");

    const cameraState = { x: 0, y: 0, shakeX: 0, shakeY: 0 };

    this.inputSys = new InputSystem(this.gameMap, this.spriteManager);
    this.physicsSys = new PhysicsSystem();

    this.camSys = new CamSystem(
      cameraState,
      this.gameMap.bound.width,
      this.gameMap.bound.height,
      this.mainCanvas.width,
      this.mainCanvas.height
    );

    this.renderSys = new RenderSystem(
      this.mainCanvas,
      this.terrainCanvas,
      cameraState,
      this.bgImage,
      this.ruleImage
    );

    this.terrainSys = new TerrainSystem(
      this.gameMap,
      this.tCtx,
      this.world,
      this.spriteManager
    );

    this.physicsSys.setDependencies(
      this.gameMap,
      GAME_STATE,
      this.terrainSys,
      CameraFocus
    );

    window.TerrainSystem = this.terrainSys;
    window.gameMap = this.gameMap;
    window.world = this.world;

    console.log("✅ Sistemas inicializados!");
  }

  createInitialEntities() {
    console.log("🎮 Criando entidades...");
    const player = this.world.createEntity();

    // Spawn point (Adjust Y=500 to ensure it's not inside a ceiling)
    const startX = this.gameMap.bound.width / 2;
    const startY = 400;

    // ✅ CREATE CHARACTER VISUALS
    const spriteSheet = this.spriteManager.get("player_char");

    if (spriteSheet) {
      // Create the animation instance using the imported class
      const anim = new SpriteAnimation(spriteSheet, true);

      this.world.addComponent(player, "renderable", {
        type: "character",
        animation: anim,
        scale: 0.5, // Adjust size (0.5 = 50%)
        offsetY: 5, // Adjust feet alignment
        color: "white",
      });
    } else {
      console.error("❌ Sprite 'player_char' not found! Using fallback box.");
      this.world.addComponent(
        player,
        "renderable",
        Renderable("tank", "#adff2f", 40)
      );
    }

    this.world.addComponent(player, "position", Position(startX, startY));
    this.world.addComponent(player, "playerControl", PlayerControl());
    this.world.addComponent(player, "cameraFocus", CameraFocus());

    // Physics Body
    this.world.addComponent(player, "body", Body(40, 40));

    this.player = player;
    console.log("✅ Player criado!");
  }

  setupUI() {
    window.changeWeapon = (id) => {
      if (WEAPON_DB[id]) {
        if (this.player && this.player.components.playerControl) {
          this.player.components.playerControl.weaponId = id;
          console.log(`🔫 Arma trocada: ${WEAPON_DB[id].name}`);
        }
      }
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("🚀 Iniciando game loop...");
    this.loop();
  }

  loop() {
    if (!this.isRunning) return;
    this.inputSys.update(this.world);
    this.physicsSys.update(this.world);
    this.camSys.update(this.world);
    this.renderSys.update(this.world);
    this.world.cleanup();
    requestAnimationFrame(() => this.loop());
  }

  stop() {
    this.isRunning = false;
  }

  reset() {
    this.stop();
    this.world.clear();
    GAME_STATE.turn = "player";
    this.createInitialEntities();
    this.start();
  }
}
