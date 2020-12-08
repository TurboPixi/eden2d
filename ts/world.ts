import { actCreate, Action, Actions } from "./actions";
import { Chunk, ChunkId } from "./chunk";
import { EntityId, EntityType, Var } from "./entity";

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

  eval(action: Action): EntityId {
    return this._actions.eval(action);
  }

  toyChunk(): Chunk {
    let chunk = this.newChunk();

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        this.eval(actCreate(EntityId.System, chunk.id, EntityType.TileBlue, x, y))
      }
    }

    for (let x = 1; x < 9; x++) {
      this.eval(actCreate(EntityId.System, chunk.id, EntityType.WallBlue, x, 0))
    }

    return chunk;
  }
}
