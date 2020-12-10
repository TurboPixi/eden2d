import { Expr, Actions, New } from "./actions";
import { Chunk, ChunkId } from "./chunk";
import { EntityType } from "./entity";

// TODO: Reliable garbage-collection on chunks.
export class World {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _actions: Actions;

  constructor() {
    this._actions = new Actions(this);
  }

  newChunk(): Chunk {
    let id = this._nextId++;
    this._chunks[id] = new Chunk(id);
    return this._chunks[id];
  }

  chunk(id: ChunkId): Chunk {
    return this._chunks[id];
  }

  eval(expr: Expr): any {
    return this._actions.eval(expr);
  }

  toyChunk(): Chunk {
    let chunk = this.newChunk();

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        this.eval([New, {
          chunk: chunk.id,
          type: EntityType.TileBlue,
          x: x, y: y
        }]);
      }
    }

    for (let x = 1; x < 9; x++) {
      this.eval([New, {
        chunk: chunk.id,
        type: EntityType.WallBlue,
        x: x, y: 0
      }]);
    }

    return chunk;
  }
}
