// js/World.js - Sistema ECS Compatível

export class World {
  constructor() {
    this.entities = [];
    this.idCounter = 0;
    this.entitiesToRemove = [];
  }

  createEntity() {
    const ent = { id: ++this.idCounter, components: {} };
    this.entities.push(ent);
    return ent;
  }

  addComponent(ent, name, data) {
    // Garante que o componente saiba a qual entidade pertence (opcional, mas útil)
    if (data && typeof data === "object") {
      data._entityId = ent.id;
    }
    ent.components[name] = data;
  }

  removeComponent(ent, name) {
    delete ent.components[name];
  }

  // ⚠️ O MÉTODO QUE FALTAVA (Correção do erro)
  removeEntity(entityId) {
    // Aceita tanto o número (ID) quanto o objeto entidade
    if (typeof entityId === "object" && entityId !== null) {
      this.entitiesToRemove.push(entityId.id);
    } else {
      this.entitiesToRemove.push(entityId);
    }
  }

  // Mantido para compatibilidade (apenas chama o removeEntity)
  markForRemoval(ent) {
    this.removeEntity(ent);
  }

  cleanup() {
    if (this.entitiesToRemove.length > 0) {
      this.entities = this.entities.filter(
        (e) => !this.entitiesToRemove.includes(e.id)
      );
      this.entitiesToRemove = [];
    }
  }

  query(comps) {
    return this.entities.filter((e) =>
      comps.every((c) => e.components.hasOwnProperty(c))
    );
  }

  clear() {
    this.entities = [];
    this.idCounter = 0;
    this.entitiesToRemove = [];
  }
}
