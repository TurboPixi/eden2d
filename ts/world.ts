import { EExpr } from "./script/script";
import { Chunk, ChunkId } from "./chunk";
import { EntityType } from "./entity";
import { Context, Scope } from "./script/scope";
import { builtins } from "./script/builtins";

// TODO: Reliable garbage-collection on chunks.
export class World {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _scope: Scope;
  private _ctx: Context = {
    self: () => this,
    scope: () => this._scope,
    parent: () => null as Context,
  }

  constructor() {
    this._scope = new Scope(this);

    // Put built-ins in the root scope.
    for (let def of builtins) {
      this.eval(def);
    }
  }

  get ctx(): Context { return this._ctx }

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
    return this._scope.eval(this._ctx, expr);
  }

  toyChunk(): Chunk {
    let chunk = this.newChunk();

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        this.eval(['move', { ent: ['new', chunk.id, [EntityType.TileBlue]], x: x, y: y}]);
      }
    }

    for (let x = 1; x < 9; x++) {
      this.eval(['move', { ent: ['new', chunk.id, [EntityType.WallBlue]], x: x, y: 0}]);
    }

    return chunk;
  }
}
