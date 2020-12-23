import { EExpr, evaluate, Scope, ScopeType, $, chuck, EDict, nil, _, invoke } from "./script/script";
import { Chunk, ChunkId, isChunk } from "./chunk";
import { Entity, EntityType, isEntity, Var } from "./entity";
import { locNum, locStr, _root, _self, _set } from "./script/builtins";

export const _newChunk = $('newChunk');
export const _new = $('new');
export const _move = $('move');
export const _jump = $('jump');
export const _topWith = $('topWith');

// TODO: Reliable garbage-collection on chunks.
export class World implements Scope {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: EDict = {};

  constructor() {
    this.funcs();
  }

  get type(): ScopeType { return ScopeType.WORLD }
  get name(): string { return "[world]" }
  get self(): EExpr { return this }
  get parent(): Scope { return _root }
  get world(): World { return this }
  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(name: string): EExpr { return this._defs[name] }
  def(name: string, value: EExpr): void { this._defs[name] = value }

  newChunk(): Chunk {
    let id = this._nextId++;
    this._chunks[id] = new Chunk(this, id);
    return this._chunks[id];
  }

  chunk(id: ChunkId): Chunk {
    return this._chunks[id];
  }

  toyChunk(): Chunk {
    let chunk = this.newChunk();

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        evaluate(this, [_move, [_new, chunk, EntityType.TileBlue], x, y]);
      }
    }

    for (let x = 1; x < 9; x++) {
      evaluate(this, [_move, [_new, chunk, EntityType.WallBlue], x, 0]);
    }

    return chunk;
  }

  private funcs() {
    invoke(this, [
      [_set, _self, 'newChunk', _(
        function (scope: Scope): EExpr {
          return worldFrom(scope).newChunk();
        }
      )],

      [_set, _self, 'new', _({ chunk: nil, type: nil },
        function (scope: Scope): EExpr {
          let chunk = locChunk(scope, 'chunk');
          let ent = new Entity(locStr(scope, 'type') as EntityType);
          chunk.addEntity(ent);
          return ent;
        }
      )],

      [_set, _self, 'move', _({ ent: nil, x: 0, y: 0 },
        function (scope: Scope): EExpr {
          let x = locNum(scope, 'x');
          let y = locNum(scope, 'y');
          let ent = locEnt(scope, 'ent');
          ent.move(x, y);
          return undefined;
        }
      )],

      [_set, _self, 'jump', _({ ent: nil, chunk: nil },
        function (scope: Scope): EExpr {
          let ent = locEnt(scope, 'ent');
          let to = locChunk(scope, 'chunk');
          to.addEntity(ent);
          return ent;
        }
      )],

      [_set, _self, 'portal', _({ type: nil, from: nil, fx: 0, fy: 0, to: nil, tx: 0, ty: 0 },
        { ent: [_new, $('from'), $('type')] },
        [_move, $('ent'), $('fx'), $('fy')],
        [_set, $('ent'), Var.PortalChunk, $('to')],
        [_set, $('ent'), Var.PortalX, $('tx')],
        [_set, $('ent'), Var.PortalY, $('ty')],
        $('ent')
      )],

      [_set, _self, 'topWith', _({ chunk: nil, x: 0, y: 0, var: nil },
        function (scope: Scope): EExpr {
          let chunk = locChunk(scope, 'chunk');
          let x = locNum(scope, 'x');
          let y = locNum(scope, 'y');
          let v = locStr(scope, 'var');
          let ents = chunk.entitiesAt(x, y);
          for (var ent of ents) {
            if (ent.ref(v) !== undefined) {
              return ent;
            }
          }
          return undefined;
        }
      )],
    ]);
  }
}

export function isWorld(expr: EExpr): World {
  if (expr instanceof World) {
    return expr as World;
  }
  return undefined;
}

function worldFrom(scope: Scope): World {
  let cur = scope;
  while (cur) {
    if (cur instanceof World) {
      return cur;
    }
    cur = cur.parent;
  }
  chuck(scope, "missing world scope");
}

function locChunk(scope: Scope, name: string): Chunk {
  let chunk = isChunk(scope.ref(name));
  if (chunk === undefined) {
    chuck(scope, `${name}: ${scope.ref(name)} is not a chunk`);
  }
  return chunk as Chunk;
}

function locEnt(scope: Scope, name: string): Entity {
  let ent = isEntity(scope.ref(name));
  if (ent === undefined) {
    chuck(scope, `${name}: ${scope.ref(name)} is not an entity`);
  }
  return ent as Entity;
}
