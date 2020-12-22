import { EExpr, EVal, evaluate, Scope, ScopeType, $, _func, _self, _set, chuck } from "./script/script";
import { Chunk, ChunkId, isChunk } from "./chunk";
import { Entity, EntityType, isEntity, Var } from "./entity";
import { locNum, locStr, _move, _new, _root } from "./script/builtins";

// TODO: Reliable garbage-collection on chunks.
export class World implements Scope {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: { [name: string]: EVal } = {};

  constructor() {
    this.funcs();
  }

  get type(): ScopeType { return ScopeType.WORLD }
  get name(): string { return "[world]" }
  get self(): EVal { return this }
  get parent(): Scope { return _root }
  get world(): World { return this }
  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(name: string): EVal { return this._defs[name] }
  def(name: string, value: EVal): void { this._defs[name] = value }

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
    evaluate(this, [
      {},

      [_set, _self, 'newChunk', [_func, [],
        function (scope: Scope): EVal {
          return worldFrom(scope).newChunk();
        }
      ]],

      [_set, _self, 'new', [_func, ['chunk', 'type'],
        function (scope: Scope): EVal {
          let chunk = locChunk(scope, 'chunk');
          let ent = new Entity(locStr(scope, 'type') as EntityType);
          chunk.addEntity(ent);
          return ent;
        }
      ]],

      [_set, _self, 'move', [_func, ['ent', 'x', 'y'],
        function (scope: Scope): EVal {
          let x = locNum(scope, 'x');
          let y = locNum(scope, 'y');
          let ent = locEnt(scope, 'ent');
          ent.move(x, y);
          return undefined;
        }
      ]],

      [_set, _self, 'jump', [_func, ['ent', 'chunk'],
        function (scope: Scope): EVal {
          let ent = locEnt(scope, 'ent');
          let to = locChunk(scope, 'chunk');
          to.addEntity(ent);
          return ent;
        }
      ]],

      [_set, _self, 'portal', [_func, ['type', 'from', 'fx', 'fy', 'to', 'tx', 'ty'],
        [{ ent: [_new, $('from'), $('type')] },
          [_move, $('ent'), $('fx'), $('fy')],
          [_set, $('ent'), Var.PortalChunk, $('to')],
          [_set, $('ent'), Var.PortalX, $('tx')],
          [_set, $('ent'), Var.PortalY, $('ty')],
          $('ent')
        ]
      ]],

      [_set, _self, 'topWith', [_func, ['chunk', 'x', 'y', 'var'],
        function (scope: Scope): EVal {
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
      ]],
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
