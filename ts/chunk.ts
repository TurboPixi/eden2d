import { Container } from "pixi.js";
import { Entity, EntityType } from "./entity";
import { evaluate } from "./script/eval";
import { parse } from "./script/kurt";
import { IScope, isScope, locNum, locStr, locSym, Scope, scopeEval, scopeParent, scopeRef } from "./script/scope";
import { $, $$, chuck, EDict, EExpr, ESym, symName, _, _blk, _def, _parent, _self, _set } from "./script/script";
import { World } from "./world";

export type ChunkId = number;

export let ChunkClass = [_def, $$('Chunk'), {
  'make-ent': [$('type'), _blk, (scope: Scope) => {
    let chunk = locChunk(scope, _self);
    let ent = new Entity(scope, locStr(scope, $('type')) as EntityType);
    chunk.addEntity(ent);
    return ent;
  }],

  'top-with': [$('x'), $('y'), $('var'), _blk, (scope: Scope) => {
    let chunk = locChunk(scope, _self);
    let x = locNum(scope, $('x'));
    let y = locNum(scope, $('y'));
    let v = locSym(scope, $('var'));
    let ents = chunk.entitiesAt(x, y);
    for (var ent of ents) {
      if (ent.ref(v) !== undefined) {
        return ent;
      }
    }
    return undefined;
  }],

  portal: parse(`[type fx fy to tx ty | do
    [def :ent [[@:make-ent] type]]
    [[ent:move-to] fx fy]
    [set ent:portalchunk to]
    [set ent:portalx tx]
    [set ent:portaly ty]
    ent
  ]`),
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

  tick(x: number, y: number, z: number, w: number, h: number) {
    this._container.setTransform(-x * z, -y * z, z, z);
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
