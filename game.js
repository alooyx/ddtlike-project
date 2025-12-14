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
import { SpriteManager } from "./js/SpriteManager.js";
import { MapLoader } from "./js/MapLoader.js"; // CORREÇÃO: Importa MapLoader, não Map
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

      // 3. Inicializa sistemas
      this.initSystems();

      // 4. Pré-carrega explosões (TerrainSystem precisa estar inicializado)
      // Isso garante que os sprites de explosão estejam prontos antes do tiro sair
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
      // 1. Carrega Sprite do Projétil
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

      // NOTA: Explosões são carregadas depois pelo TerrainSystem.preloadExplosions
      // para manter o código organizado.
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

    // Usa MapLoader corretamente
    const resultado = await MapLoader.loadFromImage("./ddt.png");
    const { mapInstance, mapImage } = resultado;

    // 1. O Canvas Principal define o tamanho da sua "JANELA" de jogo.
    // Ele deve ser menor que o mapa para a câmera poder andar.
    // Aqui fixamos em 1200x600 (padrão HD de navegador), mas pode ajustar.
    this.mainCanvas.width = 1600;
    this.mainCanvas.height = 900;

    // 2. O Canvas de Terreno guarda o MAPA INTEIRO.
    // Esse continua com o tamanho total da imagem (ex: 2000px, 4000px...)
    this.terrainCanvas.width = mapInstance.bound.width;
    this.terrainCanvas.height = mapInstance.bound.height;

    // ===============================================================

    // Desenha o mapa inicial no canvas de terreno (marrom)
    this.tCtx.drawImage(mapImage, 0, 0);

    this.gameMap = mapInstance;

    console.log(
      `✅ Mapa carregado! Mundo: ${this.terrainCanvas.width}x${this.terrainCanvas.height} | Tela: ${this.mainCanvas.width}x${this.mainCanvas.height}`
    );

    // Desenha o mapa inicial no canvas de terreno (marrom)
    this.tCtx.drawImage(mapImage, 0, 0);

    this.gameMap = mapInstance;

    console.log("✅ Mapa carregado!");
  }

  initSystems() {
    console.log("⚙️ Inicializando sistemas...");

    this.inputSys = new InputSystem(this.gameMap, this.spriteManager);
    this.physicsSys = new PhysicsSystem();
    this.renderSys = new RenderSystem(this.mainCanvas, this.terrainCanvas);

    // Inicializa TerrainSystem
    this.terrainSys = new TerrainSystem(
      this.gameMap,
      this.tCtx,
      this.world,
      this.spriteManager
    );

    // Injeta dependências na Física
    this.physicsSys.setDependencies(
      this.gameMap,
      GAME_STATE,
      this.terrainSys,
      CameraFocus
    );

    // Globais para debug/InputSystem
    window.TerrainSystem = this.terrainSys;
    window.gameMap = this.gameMap;
    window.world = this.world;

    console.log("✅ Sistemas inicializados!");
  }

  createInitialEntities() {
    console.log("🎮 Criando entidades...");

    const player = this.world.createEntity();

    // Posiciona o player no meio do mapa, lá no alto (para cair no chão)
    const startX = this.gameMap.bound.width / 2;
    const startY = 100;

    this.world.addComponent(player, "position", Position(startX, startY));
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

    // Ordem de atualização: Input -> Física -> Render
    this.inputSys.update(this.world);
    this.physicsSys.update(this.world);
    this.renderSys.update(this.world);

    // Limpa entidades mortas
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
    this.createInitialEntities(); // Recria o player
    this.start();
    console.log("🔄 Jogo resetado");
  }
}
