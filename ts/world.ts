import { EExpr, EDict, __, symName, ESym, _do, _def, _blk, _set, _parent, _, _parentTag } from "./script/script";
import { Chunk, ChunkId } from "./chunk";
import { _eval } from "./script/eval";
import { IDict, Dict, _root } from "./script/dict";

import { _parse } from "./script/parse";
import { registerDefroster } from "./script/freezer";

// TODO: Reliable garbage-collection on chunks.
export class World implements IDict {
  static inst = new World();

  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: EDict = {};

  private constructor() {
    _eval(_root, [_def, this, {
      'make-chunk': [_blk, function (env: Dict): EExpr {
        return World.inst.makeChunk();
      }]
    }])
  }

  defrost(defs: EDict, nextId: ChunkId, chunks: { [id: number]: Chunk }) {
    this._defs = defs;
    this._nextId = nextId;
    this._chunks = chunks;
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

  native(): any {
    return {
      native: 'World',
      defs: this._defs,
      nextId: this._nextId,
      chunks: this._chunks,
    }
  }
}

registerDefroster('World', (obj) => {
  World.inst.defrost(obj.defs, obj.nextId, obj.chunks);
  return World.inst;
});
