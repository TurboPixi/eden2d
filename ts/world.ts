import { EExpr, $, $$, chuck, EDict, __, symName, ESym, _do, _def, _blk, _set, _parent, _ } from "./script/script";
import { Chunk, ChunkClass, ChunkId } from "./chunk";
import { _eval } from "./script/eval";
import { IScope, Scope, scopeDef, scopeParent, _root } from "./script/scope";
import { Entity, EntityClass } from "./entity";
import { parse } from "./script/kurt";
import { Loc } from "./loc";
import { Render } from "./render";

import player_kurt from "./player.kurt";
import tiles_kurt from "./tiles.kurt";
import items_kurt from "./items.kurt";

// TODO: Reliable garbage-collection on chunks.
export class World implements IScope {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: EDict = {};

  constructor() {
    _eval(this, ChunkClass);
    _eval(this, EntityClass);
    _eval(this, [_def, $$('Loc'), Loc.Dict]);
    _eval(this, [_def, $$('Render'), Render.Dict]);
    _eval(this, parse(player_kurt));
    _eval(this, parse(tiles_kurt));
    _eval(this, parse(items_kurt));

    scopeDef(this, $('parent'), _root);
    _eval(this, [_do,
      [_def, $$('make-chunk'), [_blk,
        function (scope: Scope): EExpr {
          return worldFrom(scope).makeChunk();
        }
      ]],

      [_def, $$('make-ent'), [_blk,
        function (scope: Scope): EExpr {
          return new Entity(scope);
        }
      ]],
    ]);
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
        _eval(this, [$('make-at'), [$('Floor'), $$('make')], chunk, x, y]);
      }
    }

    for (let x = 1; x < 9; x++) {
      _eval(this, [$('make-at'), [$('Wall'), $$('make')], chunk, x, 0]);
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
