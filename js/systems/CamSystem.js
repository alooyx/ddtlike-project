// js/systems/CamSystem.js

export class CamSystem {
  constructor(cameraState, mapWidth, mapHeight, screenWidth, screenHeight) {
    // Recebe o estado compartilhado da câmera
    this.camera = cameraState;

    // Dimensões para calcular os limites (Clamp)
    this.mapW = mapWidth;
    this.mapH = mapHeight;
    this.screenW = screenWidth;
    this.screenH = screenHeight;
  }

  update(world) {
    // 1. Lógica de SEGUIR O ALVO
    const focusTargets = world.query(["position", "cameraFocus"]);
    if (focusTargets.length > 0) {
      const target = focusTargets[0].components.position;
      const smoothing = 0.1; // Velocidade da câmera

      // Calcula onde a câmera QUER estar (Centralizada no alvo)
      let targetX = target.x - this.screenW / 2;
      let targetY = target.y - this.screenH / 2;

      // --- Aplica os LIMITES (Clamp) ---
      // Impede sair pelas laterais
      targetX = Math.max(0, Math.min(targetX, this.mapW - this.screenW));

      // Impede sair por baixo (chão), mas libera o teto (-500)
      targetY = Math.max(-500, Math.min(targetY, this.mapH - this.screenH));

      // Movimento Suave (Lerp)
      this.camera.x += (targetX - this.camera.x) * smoothing;
      this.camera.y += (targetY - this.camera.y) * smoothing;
    }

    // 2. Lógica de TREMOR (Screen Shake)
    this.updateShake(world);
  }

  updateShake(world) {
    let intensity = 0;
    const explosions = world.query(["explosion", "renderable"]);

    // Calcula a maior intensidade de tremor baseado nas explosões ativas
    explosions.forEach((ent) => {
      const rend = ent.components.renderable;
      const anim = rend.animation;
      if (anim) {
        const totalFrames = anim.spriteSheet.totalFrames || 10;
        const progress = anim.currentFrame / totalFrames;

        // Tremor decai com o tempo da animação
        const decay = Math.max(0, 1 - progress);
        const baseForce = 20 * (rend.scale || 1.0);

        intensity = Math.max(intensity, baseForce * decay);
      }
    });

    if (intensity > 0.5) {
      this.camera.shakeX = (Math.random() - 0.5) * intensity;
      this.camera.shakeY = (Math.random() - 0.5) * intensity;
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
    }
  }
}
