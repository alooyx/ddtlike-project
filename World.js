// js/World.js - Sistema ECS

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
    ent.components[name] = data;
  }

  removeComponent(ent, name) {
    delete ent.components[name];
  }

  markForRemoval(ent) {
    this.entitiesToRemove.push(ent.id);
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
