export class EulerVector {
  /**
   * @param {number} x0 - Posição inicial
   * @param {number} x1 - Velocidade inicial
   * @param {number} x2 - Aceleração inicial
   */
  constructor(x0, x1, x2) {
    this.x0 = x0;
    this.x1 = x1;
    this.x2 = x2;
  }

  clear() {
    this.x0 = 0;
    this.x1 = 0;
    this.x2 = 0;
  }

  clearMotion() {
    this.x1 = 0;
    this.x2 = 0;
  }

  /**
   * Resolve a equação a.x'' + b.x' + c.x = d usando o método de Euler.
   * @param {number} m - Massa
   * @param {number} af - Fator de resistência do ar (Air Resistance Force)
   * @param {number} f - Força externa (Vento/Gravidade)
   * @param {number} dt - Delta Time (passo de tempo)
   */
  computeOneEulerStep(m, af, f, dt) {
    // Calcula a aceleração: (ForçaExterna - Resistência * Velocidade) / Massa
    this.x2 = (f - af * this.x1) / m;

    // Atualiza a velocidade
    this.x1 = this.x1 + this.x2 * dt;

    // Atualiza a posição
    this.x0 = this.x0 + this.x1 * dt;
  }

  toString() {
    return `x:${this.x0},v:${this.x1},a:${this.x2}`;
  }
}
