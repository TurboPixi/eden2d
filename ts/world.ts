import { EExpr, $, $$, chuck, EDict, nil, __, symName, ESym, _do, _def, _blk, _set, _parent, _ } from "./script/script";
import { Chunk, ChunkId, isChunk } from "./chunk";
import { Entity, EntityType, isEntity } from "./entity";
import { evaluate } from "./script/eval";
import { IScope, locNum, locStr, Scope, scopeDef, scopeEval, scopeParent, scopeRef, _root } from "./script/scope";

// TODO: Reliable garbage-collection on chunks.
export class World implements IScope {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: EDict = {};

  constructor() {
    scopeDef(this, $('parent'), _root);

    evaluate(this, [_def, $$('make-chunk'), [_blk,
      function (scope: Scope): EExpr {
        return worldFrom(scope).makeChunk();
      }
    ]]);
  }

  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(sym: ESym): EExpr { return this._defs[symName(sym)] }
  def(sym: ESym, value: EExpr): void { this._defs[symName(sym)] = value }

  makeChunk(): Chunk {
    let id = this._nextId++;
    this._chunks[id] = new Chunk(this, id);
    return this._chunks[id];
  }

  chunk(id: ChunkId): Chunk {
    return this._chunks[id];
  }

  toyChunk(): Chunk {
    let chunk = this.makeChunk();

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        evaluate(this, [[[[chunk, $$('make-ent')], EntityType.TileBlue], $$('move-to')], x, y]);
      }
    }

    for (let x = 1; x < 9; x++) {
      evaluate(this, [[[[chunk, $$('make-ent')], EntityType.WallBlue], $$('move-to')], x, 0]);
    }

    return chunk;
  }
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
