// js/utils/VisualEffects.js

export class VisualEffects {
  /**
   * Calcula o efeito "Pop Elástico" (Cresce e encolhe)
   * @param {number} baseScale - Escala original do objeto
   * @param {number} progress - Progresso da animação (0.0 a 1.0)
   * @returns {number} Nova escala dinâmica
   */
  static getElasticScale(baseScale, progress) {
    // Fase 1: Explosão (0% a 20%) -> Cresce 30%
    if (progress < 0.2) {
      return baseScale * 1.3;
    }
    // Fase 2: Recuo (20% a 40%) -> Encolhe 5%
    if (progress < 0.4) {
      return baseScale * 0.95;
    }
    // Fase 3: Estável
    return baseScale;
  }

  /**
   * Aplica o efeito de desaparecimento suave (Fade Out)
   * @param {CanvasRenderingContext2D} ctx - Contexto do Canvas
   * @param {number} progress - Progresso da animação (0.0 a 1.0)
   */
  static applyFadeOut(ctx, progress) {
    // Começa a sumir nos últimos 30% da animação
    if (progress > 0.7) {
      // Calcula opacidade de 1.0 descendo até 0.0
      ctx.globalAlpha = 1 - (progress - 0.7) / 0.3;
    }
  }

  /**
   * Aplica brilho Neon e tremor se for um efeito de energia
   * @param {CanvasRenderingContext2D} ctx - Contexto do Canvas
   * @param {string} spritePath - Caminho/Nome do arquivo da sprite
   */
  static applyNeonGlow(ctx, spritePath) {
    // Verifica se é um sprite de energia (pelo nome)
    if (spritePath.includes("shoq") || spritePath.includes("drill")) {
      // 1. Modo de Mistura "Lighter" (Soma cores = Brilho)
      ctx.globalCompositeOperation = "lighter";

      // 2. Tremor elétrico (Rotação aleatória leve)
      const randomShake = (Math.random() - 0.5) * 0.2;
      ctx.rotate(randomShake);
    }
  }
}
