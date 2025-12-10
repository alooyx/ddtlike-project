import { Physics } from "../physics.js"; // Classe pai (necessária)
// Importaremos PhysicalObjDoAction quando criarmos a pasta Actions
// import { PhysicalObjDoAction } from '../../Actions/PhysicalObjDoAction.js';

export class PhysicalObj extends Physics {
  constructor(id, name, model, defaultAction, scale, rotation) {
    super(id); // Chama o construtor da classe Physics

    this._name = name;
    this._model = model;
    this._currentAction = defaultAction;
    this._scale = scale;
    this._rotation = rotation;
    this._canPenetrate = false;
    this._game = null;
  }

  // Getters e Setters
  get type() {
    return 0; // Virtual em C#, sobrescrito nas filhas
  }

  get model() {
    return this._model;
  }

  get currentAction() {
    return this._currentAction;
  }

  set currentAction(value) {
    this._currentAction = value;
  }

  get scale() {
    return this._scale;
  }

  get rotation() {
    return this._rotation;
  }

  get canPenetrate() {
    return this._canPenetrate;
  }

  set canPenetrate(value) {
    this._canPenetrate = value;
  }

  get name() {
    return this._name;
  }

  // Métodos
  setGame(game) {
    this._game = game;
  }

  playMovie(action, delay, movieTime) {
    if (this._game) {
      // Em C#: m_game.AddAction(new PhysicalObjDoAction(this, action, delay, movieTime));
      // Como ainda não temos o sistema de Actions, deixarei comentado ou um log:
      console.log(
        `[PhysicalObj] Playing movie: ${action} (Delay: ${delay}, Time: ${movieTime})`
      );

      // Futuramente descomentar:
      // this._game.addAction(new PhysicalObjDoAction(this, action, delay, movieTime));
    }
  }

  // Sobrescrita do método da classe Physics
  collidedByObject(phy) {
    /*
        // Lógica: Se este objeto não for penetrável e colidiu com uma bomba simples
        if (this._canPenetrate === false) {
            // Verificação segura para evitar importação circular com SimpleBomb
            if (phy && phy.constructor.name === 'SimpleBomb') {
                phy.bomb();
            }
        }*/
  }
  // ... (resto da classe PhysicalObj acima)

  /**
   * MÉTODO TEMPORÁRIO PARA TESTAR A FÍSICA
   * ctx: O contexto do Canvas (para desenhar o debug)
   */
  startGravityTest(ctx) {
    console.log("Iniciando simulação de gravidade para:", this._name);
    this.isMoving = true;

    const gravityLoop = () => {
      if (!this.isMoving) return;

      // Tenta prever a próxima posição (1 pixel para baixo)
      // Nota: Em DDTank a gravidade real é mais complexa, mas 1px serve para teste
      let nextY = Math.floor(this.y) + 1;
      let currX = Math.floor(this.x);

      // Verificação de segurança
      if (!this.map) {
        console.error("Erro: O objeto não tem um mapa associado!");
        return;
      }

      // 1. Pergunta ao mapa: O pixel abaixo está vazio?
      // (Estou assumindo que seu MapLoader tem o método isEmpty, se não tiver, avise)
      if (this.map.isEmpty(currX, nextY)) {
        // Se está vazio (ar), atualiza a posição
        this.y = nextY;

        // Limpa o canvas e redesenha (opcional, depende de como é seu loop de render)
        // Aqui vamos apenas continuar o loop
        requestAnimationFrame(gravityLoop);
      } else {
        // 2. COLISÃO DETECTADA! (Não está vazio)
        this.stopMoving();
        console.log(`Colisão detectada no chão em X:${currX}, Y:${nextY}`);

        // DESENHA O PONTO VERMELHO DE DEBUG
        if (ctx) {
          ctx.fillStyle = "red";
          ctx.fillRect(currX - 2, nextY - 2, 5, 5); // Desenha um quadrado 5x5

          // Desenha uma linha verde indicando onde ele estava
          ctx.fillStyle = "green";
          ctx.fillRect(currX, nextY - 10, 2, 10);
        }
      }
    };

    // Inicia o loop
    gravityLoop();
  }
  // Fim da classe PhysicalObj
}
