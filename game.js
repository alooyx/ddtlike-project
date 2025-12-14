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
    this.terrainSys = null;
    this.camSys = null;

    this.isRunning = false;

    console.log("🎮 === GAME INICIALIZADO ===");
  }

  async init() {
    try {
      console.log("⏳ Carregando recursos...");

      // 1. Carrega sprites de armas e projéteis
      await this.loadSprites();

      // 2. Carrega mapa
      await this.loadMap();

      // 3. Inicializa sistemas (Agora a ordem está correta)
      this.initSystems();

      // 4. Pré-carrega explosões e crateras
      await this.terrainSys.preloadExplosions();

      // 5. Cria entidades iniciais
      this.createInitialEntities();

      // 6. Configura UI
      this.setupUI();

      console.log("✅ Jogo pronto!\n");

      return true;
    } catch (err) {
      console.error("❌ ERRO ao inicializar:", err);
      return false;
    }
  }

  async loadSprites() {
    console.log("🎨 Carregando sprites de armas...");

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
        console.log(
          `✅ ${spritesToLoad.length} sprite(s) de projéteis carregada(s)`
        );
      } catch (err) {
        console.warn("⚠️ Erro ao carregar sprites:", err);
      }
    }
  }

  async loadMap() {
    console.log("🗺️ Carregando mapa...");

    const resultado = await MapLoader.loadFromImage("./ddt.png");
    const { mapInstance, mapImage } = resultado;

    // 1. Configura tamanho da Tela (Viewport)
    this.mainCanvas.width = 1600;
    this.mainCanvas.height = 900;

    // 2. Configura tamanho do Mundo (Full Map)
    this.terrainCanvas.width = mapInstance.bound.width;
    this.terrainCanvas.height = mapInstance.bound.height;

    // Desenha o mapa inicial no canvas de terreno (marrom)
    this.tCtx.drawImage(mapImage, 0, 0);

    this.gameMap = mapInstance;

    console.log(
      `✅ Mapa carregado! Mundo: ${this.terrainCanvas.width}x${this.terrainCanvas.height} | Tela: ${this.mainCanvas.width}x${this.mainCanvas.height}`
    );
  }

  initSystems() {
    console.log("⚙️ Inicializando sistemas...");

    // 1. Cria o objeto compartilhado da Câmera PRIMEIRO
    const cameraState = { x: 0, y: 0, shakeX: 0, shakeY: 0 };

    this.inputSys = new InputSystem(this.gameMap, this.spriteManager);
    this.physicsSys = new PhysicsSystem();

    // 2. Inicializa CamSystem (O Cérebro da Câmera)
    this.camSys = new CamSystem(
      cameraState,
      this.gameMap.bound.width,
      this.gameMap.bound.height,
      this.mainCanvas.width,
      this.mainCanvas.height
    );

    // 3. Inicializa RenderSystem (O Pintor) - Recebe o mesmo cameraState
    this.renderSys = new RenderSystem(
      this.mainCanvas,
      this.terrainCanvas,
      cameraState
    );

    // 4. Inicializa TerrainSystem
    this.terrainSys = new TerrainSystem(
      this.gameMap,
      this.tCtx,
      this.world,
      this.spriteManager
    );

    // 5. Injeta dependências na Física
    this.physicsSys.setDependencies(
      this.gameMap,
      GAME_STATE,
      this.terrainSys,
      CameraFocus
    );

    // Globais para debug
    window.TerrainSystem = this.terrainSys;
    window.gameMap = this.gameMap;
    window.world = this.world;
    //window.CONFIG = (await import("./config.js")).CONFIG; // Expondo config se precisar

    console.log("✅ Sistemas inicializados!");
  }

  createInitialEntities() {
    console.log("🎮 Criando entidades...");

    const player = this.world.createEntity();

    const startX = this.gameMap.bound.width / 2;
    const startY = 100;

    // --- MUDANÇA AQUI: Variável para controlar o tamanho do tanque ---
    const tankSize = 40; // Dobro do tamanho original (era 20)

    this.world.addComponent(player, "position", Position(startX, startY));

    // Usa tankSize para o Renderable (Visual)
    this.world.addComponent(
      player,
      "renderable",
      Renderable("tank", "#adff2f", tankSize)
    );

    this.world.addComponent(player, "playerControl", PlayerControl());
    this.world.addComponent(player, "cameraFocus", CameraFocus());

    // Usa tankSize para o Body (Física/Colisão)
    this.world.addComponent(player, "body", Body(tankSize, tankSize));

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
    console.log("🚀 Iniciando game loop...\n");
    this.loop();
  }

  loop() {
    if (!this.isRunning) return;

    // Ordem de atualização: Input -> Física -> Câmera -> Render
    this.inputSys.update(this.world);
    this.physicsSys.update(this.world);
    this.camSys.update(this.world); // Atualiza a posição da câmera
    this.renderSys.update(this.world); // Desenha usando a posição atualizada

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
    this.createInitialEntities();
    this.start();
    console.log("🔄 Jogo resetado");
  }
}
