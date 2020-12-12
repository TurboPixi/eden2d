import { EExpr } from "./script/script";
import { Chunk, ChunkId } from "./chunk";
import { EntityType } from "./entity";
import { Scope } from "./script/scope";

// TODO: Reliable garbage-collection on chunks.
export class World {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _scope: Scope;

  constructor() {
    this._scope = new Scope(this);
  }

  newChunk(): Chunk {
    let id = this._nextId++;
    this._chunks[id] = new Chunk(this, id);
    return this._chunks[id];
  }

  chunk(id: ChunkId): Chunk {
    return this._chunks[id];
  }

  get scope() { return this._scope }

  eval(expr: EExpr): any {
    return this._scope.eval(expr);
  }

  toyChunk(): Chunk {
    let chunk = this.newChunk();

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        this.eval(['move', { ent: ['new', { chunk: chunk.id, type: EntityType.TileBlue}], x: x, y: y}]);
      }
    }

    for (let x = 1; x < 9; x++) {
      this.eval(['move', { ent: ['new', { chunk: chunk.id, type: EntityType.WallBlue}], x: x, y: 0}]);
    }

    return chunk;
  }
}
