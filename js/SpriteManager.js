// SpriteManager.js - Sistema de Sprite Sheets para Projéteis

export class SpriteSheet {
  constructor(imagePath, frameWidth, frameHeight, totalFrames, fps = 10) {
    this.image = null;
    this.imagePath = imagePath;

    // If 0 is passed, we will detect it later in load()
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;

    this.totalFrames = totalFrames;
    this.fps = fps;
    this.frameDuration = 1000 / fps; // ms por frame
    this.loaded = false;

    console.log(
      `🎨 SpriteSheet criada: ${imagePath} (${frameWidth}x${frameHeight}, ${totalFrames} frames)`
    );
  }

  // Carrega a imagem da sprite sheet
  load() {
    return new Promise((resolve, reject) => {
      this.image = new Image();
      this.image.crossOrigin = "Anonymous";

      this.image.onload = () => {
        this.loaded = true;
        // [NEW] SMART AUTO-DETECT
        // If width/height is 0, use the actual image dimensions
        if (!this.frameWidth)
          this.frameWidth = this.image.width / this.totalFrames;
        if (!this.frameHeight) this.frameHeight = this.image.height;

        console.log(
          `✅ Loaded: ${this.imagePath} (${this.image.width}x${this.image.height}) -> Frame: ${this.frameWidth}x${this.frameHeight}`
        );
        resolve(this);
      };

      this.image.onerror = (err) => {
        console.error(`❌ Erro ao carregar sprite: ${this.imagePath}`);
        reject(err);
      };

      this.image.src = this.imagePath;
    });
  }

  // Retorna os dados de um frame específico
  getFrame(frameIndex) {
    if (!this.loaded) {
      console.warn("⚠️ Sprite sheet não carregada ainda!");
      return null;
    }

    // Clamp do índice
    frameIndex = Math.max(0, Math.min(frameIndex, this.totalFrames - 1));

    return {
      image: this.image,
      sx: frameIndex * this.frameWidth, // X na sprite sheet
      sy: 0, // Y na sprite sheet (sempre 0 se horizontal)
      sw: this.frameWidth, // Largura do corte
      sh: this.frameHeight, // Altura do corte
    };
  }
}

// Componente ECS para animação de sprites
export class SpriteAnimation {
  constructor(spriteSheet, loop = true) {
    this.spriteSheet = spriteSheet;
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.loop = loop;
    this.playing = true;
  }

  update(deltaTime) {
    if (!this.playing || !this.spriteSheet.loaded) return;

    this.elapsedTime += deltaTime;

    // Troca de frame
    if (this.elapsedTime >= this.spriteSheet.frameDuration) {
      this.elapsedTime = 0;
      this.currentFrame++;

      // Loop ou pausa no último frame
      if (this.currentFrame >= this.spriteSheet.totalFrames) {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = this.spriteSheet.totalFrames - 1;
          this.playing = false;
        }
      }
    }
  }

  getCurrentFrame() {
    return this.spriteSheet.getFrame(this.currentFrame);
  }

  reset() {
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.playing = true;
  }
}

// Gerenciador global de sprite sheets
export class SpriteManager {
  constructor() {
    this.sprites = new Map();
  }

  // Registra uma nova sprite sheet
  register(id, spriteSheet) {
    this.sprites.set(id, spriteSheet);
    console.log(`📦 Sprite registrada: ${id}`);
  }

  // Carrega uma sprite sheet e registra
  async loadAndRegister(
    id,
    imagePath,
    frameWidth,
    frameHeight,
    totalFrames,
    fps = 10
  ) {
    const spriteSheet = new SpriteSheet(
      imagePath,
      frameWidth,
      frameHeight,
      totalFrames,
      fps
    );
    await spriteSheet.load();
    this.register(id, spriteSheet);
    return spriteSheet;
  }

  // Pega uma sprite sheet registrada
  get(id) {
    return this.sprites.get(id);
  }

  // Carrega múltiplas sprites de uma vez
  async loadMultiple(spriteConfigs) {
    const promises = spriteConfigs.map((config) =>
      this.loadAndRegister(
        config.id,
        config.path,
        config.frameWidth,
        config.frameHeight,
        config.totalFrames,
        config.fps || 10
      )
    );

    return Promise.all(promises);
  }
}
