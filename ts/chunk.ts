import { Container } from "pixi.js";
import { Entity, EntityId } from "./entity";

export type ChunkId = number;

// TODO: Lazy-init containers (and thus the underlying entity sprites), because most will be invisible most of the time.
export class Chunk {
  private _entities: { [id: number]: Entity } = {};
  private _nextId = 1;
  private _container: Container;

  constructor(private _id: ChunkId) {
    this._container = new Container();
  }

  get id(): ChunkId {
    return this._id;
  }

  get container(): Container {
    return this._container;
  }

  entitiesAt(x: number, y: number): Entity[] {
    // TODO: Do some indexing to not make this obscenely slow.
    let ents: Entity[] = [];
    for (let id in this._entities) {
      let ent = this._entities[id];
      if (ent.x == x && ent.y == y) {
        ents.push(ent);
      }
    }
    return ents;
  }

  entity(id: EntityId): Entity {
    return this._entities[id];
  }

  addEntity(entity: Entity, x?: number, y?: number) {
    if (entity.chunk) {
      if (entity.chunk == this) {
        return;
      }
      entity.chunk.removeEntity(entity);
    }

    entity.setChunkId(this, this._nextId++);
    this._entities[entity.id] = entity;
    this._container.addChild(entity.sprite);
    entity.move(x || 0, y || 0);
  }

  removeEntity(entity: Entity) {
    if (entity.chunk != this) {
      return;
    }

    entity.setChunk(null, 0);
    delete this._entities[entity.id];
    this._container.removeChild(entity.sprite);
  }

  tick(x: number, y: number, z: number, w: number, h : number) {
    this._container.setTransform(-x * z, -y * z, z, z);
  }
}
