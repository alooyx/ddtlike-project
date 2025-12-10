// game.js - Core principal do jogo

import { IMPACT_TYPES, WEAPON_DB, CONFIG, GAME_STATE } from "./config.js";
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
import { SpriteManager } from "./js/SpriteManager.js";
import { MapLoader } from "./js/MapLoader.js";
import { Tile } from "./Maps/Tile.js";

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
    this.terrainSys = null; // 💥 NOVO

    this.isRunning = false;

    console.log("🎮 === GAME INICIALIZADO ===");
  }

  async init() {
    try {
      console.log("⏳ Carregando recursos...");

      // 1. Carrega sprites
      await this.loadSprites();

      // 2. Carrega mapa
      await this.loadMap();

      // 3. Inicializa sistemas
      this.initSystems();

      // 4. Cria entidades iniciais
      this.createInitialEntities();

      // 5. Configura UI
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

    const spritesToLoad = [];

    for (const [weaponId, weaponData] of Object.entries(WEAPON_DB)) {
      if (weaponData.spriteId && weaponData.sprite) {
        spritesToLoad.push({
          id: weaponData.spriteId,
          path: weaponData.sprite.path,
          frameWidth: weaponData.sprite.frameWidth,
          frameHeight: weaponData.sprite.frameHeight,
          totalFrames: weaponData.sprite.totalFrames,
          fps: weaponData.sprite.fps || 10,
        });
      }
    }

    if (spritesToLoad.length > 0) {
      try {
        await this.spriteManager.loadMultiple(spritesToLoad);
        console.log(`✅ ${spritesToLoad.length} sprite(s) carregada(s)`);
      } catch (err) {
        console.warn("⚠️ Erro ao carregar sprites:", err);
      }
    } else {
      console.log("ℹ️ Nenhuma sprite configurada");
    }
  }

  async loadMap() {
    console.log("🗺️ Carregando mapa...");

    const resultado = await MapLoader.loadFromImage("./ddt.png");
    const { mapInstance, mapImage } = resultado;

    this.mainCanvas.width = mapInstance.bound.width;
    this.mainCanvas.height = mapInstance.bound.height;
    this.terrainCanvas.width = mapInstance.bound.width;
    this.terrainCanvas.height = mapInstance.bound.height;
    this.tCtx.drawImage(mapImage, 0, 0);

    this.gameMap = mapInstance;

    // Cria caixa de teste
    console.log("📦 Criando caixa de teste...");
    const caixaTeste = Tile.createRectTile(200, 50);
    const boxX = mapInstance.bound.width / 2 - 100;
    const boxY = 400;
    this.gameMap.add(boxX, boxY, caixaTeste);
    this.tCtx.fillStyle = "red";
    this.tCtx.fillRect(boxX, boxY, 200, 50);

    console.log("✅ Mapa carregado!");
  }

  initSystems() {
    console.log("⚙️ Inicializando sistemas...");

    this.inputSys = new InputSystem(this.gameMap, this.spriteManager);
    this.physicsSys = new PhysicsSystem();
    this.renderSys = new RenderSystem(this.mainCanvas, this.terrainCanvas);

    // 💥 NOVO: TerrainSystem
    this.terrainSys = new TerrainSystem(
      this.gameMap,
      this.tCtx,
      this.world,
      this.spriteManager
    );

    // Configura PhysicsSystem com dependências
    this.physicsSys.setDependencies(
      this.gameMap,
      GAME_STATE,
      this.terrainSys, // 💥 Passa TerrainSystem ao invés do objeto antigo
      CameraFocus
    );

    // 💥 Expõe globalmente para InputSystem usar
    window.TerrainSystem = this.terrainSys;
    window.gameMap = this.gameMap;
    window.world = this.world;

    console.log("✅ Sistemas inicializados!");
  }

  createInitialEntities() {
    console.log("🎮 Criando entidades...");

    const player = this.world.createEntity();
    this.world.addComponent(
      player,
      "position",
      Position(this.gameMap.bound.width / 2, 100)
    );
    this.world.addComponent(
      player,
      "renderable",
      Renderable("tank", "#adff2f", 20)
    );
    this.world.addComponent(player, "playerControl", PlayerControl());
    this.world.addComponent(player, "cameraFocus", CameraFocus());
    this.world.addComponent(player, "body", Body(20, 20));

    this.player = player;

    console.log("✅ Player criado!");
  }

  setupUI() {
    window.changeWeapon = (id) => {
      if (WEAPON_DB[id]) {
        this.player.components.playerControl.weaponId = id;
        console.log(`🔫 Arma trocada: ${WEAPON_DB[id].name}`);
      }
    };
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("🚀 Iniciando game loop...\n");
    this.loop();
  }

  loop() {
    if (!this.isRunning) return;

    this.inputSys.update(this.world);
    this.physicsSys.update(this.world);
    this.renderSys.update(this.world);
    this.world.cleanup();

    requestAnimationFrame(() => this.loop());
  }

  stop() {
    this.isRunning = false;
    console.log("⏸️ Jogo pausado");
  }

  reset() {
    this.stop();
    this.world.clear();
    GAME_STATE.turn = "player";
    console.log("🔄 Jogo resetado");
  }
}
