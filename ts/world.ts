import { EExpr, $, $$, chuck, EDict, nil, __, symName, ESym, _do, _def, _blk, _set, _parent } from "./script/script";
import { Chunk, ChunkId, isChunk } from "./chunk";
import { Entity, EntityType, isEntity } from "./entity";
import { evaluate } from "./script/eval";
import { IScope, locNum, locStr, Scope, scopeDef, scopeEval, scopeParent, scopeRef, _root } from "./script/scope";
import { parse } from "./script/kurt";

export const _newChunk = $('newChunk');
export const _new = $('new');
export const _move = $('move');
export const _jump = $('jump');
export const _topWith = $('topWith');

// TODO: Reliable garbage-collection on chunks.
export class World implements IScope {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: EDict = {};

  constructor() {
    this.funcs();
    scopeDef(this, $('parent'), _root);
  }

  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(sym: ESym): EExpr { return this._defs[symName(sym)] }
  def(sym: ESym, value: EExpr): void { this._defs[symName(sym)] = value }

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
    evaluate(this, [_def, $$('newChunk'), [_blk,
      function (scope: Scope): EExpr {
        return worldFrom(scope).newChunk();
      }
    ]]);

    evaluate(this, [_def, $$('new'), [$('chunk'), $('type'), _blk,
      function (scope: Scope): EExpr {
        let chunk = locChunk(scope, $('chunk'));
        let ent = new Entity(locStr(scope, $('type')) as EntityType);
        chunk.addEntity(ent);
        return ent;
      }
    ]]);

    evaluate(this, [_def, $$('move'), [$('ent'), $('x'), $('y'), _blk,
      function (scope: Scope): EExpr {
        let x = locNum(scope, $('x'));
        let y = locNum(scope, $('y'));
        let ent = locEnt(scope, $('ent'));
        ent.move(x, y);
        return undefined;
      }
    ]]);

    evaluate(this, [_def, $$('jump'), [$('ent'), $('chunk'), _blk,
      function (scope: Scope): EExpr {
        let ent = locEnt(scope, $('ent'));
        let to = locChunk(scope, $('chunk'));
        to.addEntity(ent);
        return ent;
      }
    ]]);

    evaluate(this, [_def, $$('topWith'), [$('chunk'), $('x'), $('y'), $('var'), _blk,
      function (scope: Scope): EExpr {
        let chunk = locChunk(scope, $('chunk'));
        let x = locNum(scope, $('x'));
        let y = locNum(scope, $('y'));
        let v = scopeRef(scope, $('var')) as ESym;
        let ents = chunk.entitiesAt(x, y);
        for (var ent of ents) {
          if (ent.ref(v) !== undefined) {
            return ent;
          }
        }
        return undefined;
      }
    ]]);

    evaluate(this, parse(`
      [def :portal [type from fx fy to tx ty|
        do
          [def :ent [new from type]]
          [move ent fx fy]
          [set ent:portalchunk to]
          [set ent:portalx tx]
          [set ent:portaly ty]
          ent
        ]
      ]`
    ));
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
    cur = scopeParent(cur);
  }
  chuck(scope, "missing world scope");
}

function locChunk(scope: Scope, sym: ESym): Chunk {
  let chunk = isChunk(scopeEval(scope, sym));
  if (chunk === undefined) {
    chuck(scope, `${name}: ${scopeRef(scope, sym)} is not a chunk`);
  }
  return chunk as Chunk;
}

function locEnt(scope: Scope, sym: ESym): Entity {
  let ent = isEntity(scopeEval(scope, sym));
  if (ent === undefined) {
    chuck(scope, `${name}: ${scopeRef(scope, sym)} is not an entity`);
  }
  return ent as Entity;
}
