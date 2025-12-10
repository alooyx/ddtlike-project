import { PhysicalObj } from "./PhysicalObj.js"; // Você precisará dessa classe pai em breve

export class Layer extends PhysicalObj {
  constructor(id, name, model, defaultAction, scale, rotation) {
    // Chama o construtor da classe pai (PhysicalObj)
    super(id, name, model, defaultAction, scale, rotation);
  }

  // Getter para simular a propriedade Type do C#
  get type() {
    return 2;
  }
}
