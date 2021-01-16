import { Container } from "pixi.js";
import { Entity, locEnt } from "./entity";
import { evaluate } from "./script/eval";
import { IScope, isScope, locNum, locStr, locSym, Scope, scopeEval, scopeParent, scopeRef } from "./script/scope";
import { $, $$, chuck, EDict, EExpr, ESym, nil, symName, _, _blk, _def, _parent, _self, _set } from "./script/script";
import { World } from "./world";

export type ChunkId = number;

export let ChunkClass = [_def, $$('Chunk'), {
  'add': [$('ent'), _blk, (scope: Scope) => {
    let chunk = locChunk(scope, _self);
    let ent = locEnt(scope, $('ent'));
    chunk.addEntity(ent);
    return ent;
  }],

  'top-with': [$('x'), $('y'), $('comp'), _blk, (scope: Scope) => {
    let chunk = locChunk(scope, _self);
    let x = locNum(scope, $('x'));
    let y = locNum(scope, $('y'));
    let comp = locSym(scope, $('comp'));
    let ents = chunk.entitiesAt(x, y);
    for (var ent of ents) {
      if (ent.hasComp(comp)) {
        return ent;
      }
    }
    return nil;
  }],
}];

// TODO: Lazy-init containers (and thus the underlying entity sprites), because most will be invisible most of the time.
export class Chunk implements IScope {
  private _entities: { [id: number]: Entity } = {};
  private _nextId = 1;
  private _container: Container;
  private _defs: EDict;

  constructor(private _world: World, private _id: number) {
    this._container = new Container();
    evaluate(_world, [_set, this, _(_parent), $('Chunk')]);
  }

  get id(): number { return this._id }
  get container(): Container { return this._container }

  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(name: ESym): EExpr { return this._defs && this._defs[symName(name)] }
  def(name: ESym, value: EExpr): void { (this._defs || (this._defs = {}))[symName(name)] = value }

  entitiesAt(x: number, y: number): Entity[] {
    // TODO: Do some indexing to not make this obscenely slow.
    let ents: Entity[] = [];
    for (let id in this._entities) {
      let ent = this._entities[id];
      let loc = ent.loc();
      if (loc) {
        if (loc.x == x && loc.y == y) {
          ents.push(ent);
        }
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
    if (entity.render()) {
      this._container.addChild(entity.render().sprite);
    }
  }

  removeEntity(entity: Entity) {
    if (entity.chunk != this) {
      return;
    }

    delete this._entities[entity.id];
    entity.setChunkAndId(null, 0);
    if (entity.render()) {
      this._container.removeChild(entity.render().sprite);
    }
  }

  render(x: number, y: number, z: number) {
    this._container.setTransform(-x * z, -y * z, z, z);

    // TODO: Create a nicer way to build systems with component queries.
    // TODO: Add some kind of component dirty tracking to avoid running through them all?
    for (let id in this._entities) {
      let ent = this._entities[id];
      let loc = ent.loc();
      let render = ent.render();
      if (loc && render) {
        render.sprite.position.x = loc.x * 16;
        render.sprite.position.y = loc.y * 16;
      }
    }
  }
}

export function isChunk(expr: EExpr): Chunk {
  let scope = isScope(expr);
  while (scope) {
    if (scope instanceof Chunk) {
      return expr as Chunk;
    }
    scope = scopeParent(scope);
  }
  return undefined;
}

export function locChunk(scope: Scope, sym: ESym): Chunk {
  let chunk = isChunk(scopeEval(scope, sym));
  if (chunk === undefined) {
    chuck(scope, `${name}: ${scopeRef(scope, sym)} is not a chunk`);
  }
  return chunk as Chunk;
}
