import { Container } from "pixi.js";
import { Entity, locEnt } from "./entity";
import { _eval } from "./script/eval";
import { IDict, Dict, dictParent, dictRef, isDict } from "./script/dict";
import { $, chuck, EDict, EExpr, ESym, nil, symName, _, _blk, _def, _parentTagName, _self, _set } from "./script/script";
import { World } from "./world";
import { locNum, locSym, envEval } from "./script/env";

export type ChunkId = number;

export let ChunkClass = [_def, {'Chunk': {
  'add': [$('ent'), _blk, (env: Dict) => {
    let chunk = locChunk(env, _self);
    let ent = locEnt(env, $('ent'));
    chunk.addEntity(ent);
    return ent;
  }],

  'remove': [$('ent'), _blk, (env: Dict) => {
    let chunk = locChunk(env, _self);
    let ent = locEnt(env, $('ent'));
    chunk.removeEntity(ent);
    return ent;
  }],

  'top-with': [$('x'), $('y'), $('comp'), _blk, (env: Dict) => {
    let chunk = locChunk(env, _self);
    let x = locNum(env, $('x'));
    let y = locNum(env, $('y'));
    let comp = locSym(env, $('comp'));
    let ents = chunk.entitiesAt(x, y);
    for (var ent of ents) {
      if (ent.ref(comp) !== nil) {
        return ent;
      }
    }
    return nil;
  }],
}}];

// TODO: Lazy-init containers (and thus the underlying entity sprites), because most will be invisible most of the time.
export class Chunk implements IDict {
  private _entities: { [id: number]: Entity } = {};
  private _nextId = 1;
  private _container: Container;
  private _defs: EDict;

  constructor(private _world: World, private _id: number) {
    this._container = new Container();
    _eval(_world, [_set, this, {'^': $('Chunk')}]);
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
  let env = isDict(expr);
  while (env) {
    if (env instanceof Chunk) {
      return expr as Chunk;
    }
    env = dictParent(env);
  }
  return undefined;
}

export function locChunk(env: Dict, sym: ESym): Chunk {
  let chunk = isChunk(envEval(env, sym));
  if (chunk === undefined) {
    chuck(env, `${name}: ${dictRef(env, sym)} is not a chunk`);
  }
  return chunk as Chunk;
}
