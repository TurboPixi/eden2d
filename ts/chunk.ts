import { Container } from "pixi.js";
import { Entity } from "./entity";
import { EVal, Scope } from "./script/script";
import { World } from "./world";

export type ChunkId = number;

// TODO: Lazy-init containers (and thus the underlying entity sprites), because most will be invisible most of the time.
export class Chunk implements Scope {
  private _entities: { [id: number]: Entity } = {};
  private _nextId = 1;
  private _container: Container;
  private _defs: { [name: string]: EVal };

  constructor(private _world: World, private _id: number) {
    this._container = new Container();
  }

  get id(): number { return this._id }
  get container(): Container { return this._container }
  get self() { return this }
  get parent() { return this._world }

  get name(): string { return "[chunk]" }
  get world(): World { return this._world }
  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(name: string): EVal { return this._defs && this._defs[name] }
  def(name: string, value: EVal): void { (this._defs || (this._defs = {}))[name] = value; }

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

  addEntity(entity: Entity) {
    if (entity.chunk) {
      if (entity.chunk == this) {
        return;
      }
      entity.chunk.removeEntity(entity);
    }

    let idx = this._nextId++;
    entity.setChunkAndId(this, idx);
    this._entities[idx] = entity;
    this._container.addChild(entity.sprite);
  }

  removeEntity(entity: Entity) {
    if (entity.chunk != this) {
      return;
    }

    delete this._entities[entity.id];
    entity.setChunkAndId(null, 0);
    this._container.removeChild(entity.sprite);
  }

  tick(x: number, y: number, z: number, w: number, h : number) {
    this._container.setTransform(-x * z, -y * z, z, z);
  }
}
