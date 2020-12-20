import { EVal, evaluate, Scope } from "./script/script";
import { Chunk, ChunkId } from "./chunk";
import { EntityType } from "./entity";
import { builtins } from "./script/builtins";

// TODO: Reliable garbage-collection on chunks.
export class World implements Scope {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: { [name: string]: EVal } = {};

  constructor() {
    // Put built-ins in the world scope.
    for (let def of builtins) {
      evaluate(this, def);
    }
  }

  get name(): string { return "[world]" }
  get parent(): Scope { return null }
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
        evaluate(this, [['move'], [['new'], chunk.id, EntityType.TileBlue], x, y]);
      }
    }

    for (let x = 1; x < 9; x++) {
      evaluate(this, [['move'], [['new'], chunk.id, EntityType.WallBlue], x, 0]);
    }

    return chunk;
  }
}
