import { Container } from "pixi.js";
import { entIndex, Entity, EntityId, makeEntId } from "./entity";

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
    return this._entities[entIndex(id)];
  }

  addEntity(entity: Entity, x?: number, y?: number): EntityId {
    if (entity.chunk) {
      if (entity.chunk == this) {
        return;
      }
      entity.chunk.removeEntity(entity);
    }

    let idx = this._nextId++;
    let entId = makeEntId(this._id, idx);
    entity.setChunkAndId(this, entId);
    this._entities[idx] = entity;
    this._container.addChild(entity.sprite);
    entity.move(x || 0, y || 0);
    return entId;
  }

  removeEntity(entity: Entity) {
    if (entity.chunk != this) {
      return;
    }

    entity.setChunkAndId(null, EntityId.Unknown);
    delete this._entities[entIndex(entity.id)];
    this._container.removeChild(entity.sprite);
  }

  tick(x: number, y: number, z: number, w: number, h : number) {
    this._container.setTransform(-x * z, -y * z, z, z);
  }
}
