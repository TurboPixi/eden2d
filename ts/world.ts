import { EExpr, $, $$, chuck, EDict, __, symName, ESym, _do, _def, _blk, _set, _parent, _ } from "./script/script";
import { Chunk, ChunkId } from "./chunk";
import { _eval } from "./script/eval";
import { IDict, Dict, dictParent, _root } from "./script/dict";
import { Entity } from "./entity";
import { LocComp } from "./components/loc";
import { RenderComp } from "./components/render";

import components_kurt from "./components/components.kurt";
import actions_kurt from "./actions/actions.kurt";
import player_kurt from "./actors/player.kurt";
import blocks_kurt from "./blocks/blocks.kurt";
import items_kurt from "./items/items.kurt";
import { _parse } from "./script/parse";

// TODO: Reliable garbage-collection on chunks.
export class World implements IDict {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: EDict = {};

  constructor() {
    _eval(_root, [_set, this, {'^': _root}]);

    // TODO: It's kind of gross to have to initialize all the scripts this way.
    // May need some more generalized mechanism for importing.
    _eval(this, [_def, {'Chunk': Chunk.Dict}]);
    _eval(this, [_def, {'Entity': Entity.Dict}]);
    _eval(this, _parse('components.kurt', components_kurt));
    _eval(this, [_def, {'LocComp': LocComp.Dict}]);
    _eval(this, [_def, {'RenderComp': RenderComp.Dict}]);
    _eval(this, _parse('actions.kurt', actions_kurt));
    _eval(this, _parse('player.kurt', player_kurt));
    _eval(this, _parse('blocks.kurt', blocks_kurt));
    _eval(this, _parse('items.kurt', items_kurt));

    _eval(this, [_def, {
      // Makes a new, empty chunk.
      'make-chunk': [_blk, function (env: Dict): EExpr {
        return worldFrom(env).makeChunk();
      }],

      // Makes a new entity with no components.
      'make-ent': [_blk, function (env: Dict): EExpr {
        return new Entity(env);
      }],

      // [new-ent] accepts a list of component setters, of the form {name = {comp}}, which allows it to be used
      // with component make expressions, like so:
      //
      // [new-ent [
      //   [SomeComp:make 123]
      //   [OtherComp:make :whatever 456]
      // ]]
      //
      'new-ent': _parse('World:new-ent', `[comp-sets |
        {ent = [make-ent]}
        [do
          [for-each comp-sets [setter | def ent setter]]
          ent
        ]
      ]`)
    }]);
  }

  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  exists(sym: ESym): boolean { return symName(sym) in this._defs }
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
}

function worldFrom(env: Dict): World {
  let cur = env;
  while (cur) {
    if (cur instanceof World) {
      return cur;
    }
    cur = dictParent(cur);
  }
  chuck(env, "missing world env");
}
