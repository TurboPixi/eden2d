import { Container } from "pixi.js";
import { Actions, actTransfer, topWithVar } from "./actions";
import { Chunk } from "./chunk";
import { Entity, EntityType, Var } from "./entity";
import { World } from "./world";

export class Inventory {
  private _invSlot = 0;
  private _invChunk: Chunk;
  private _cursor: Entity;

  constructor(private _world: World, private _player: Entity) {
    this._invChunk = this._world.newChunk();
    _player.setChunk(Var.Contents, this._invChunk.id)

    this._cursor = new Entity(EntityType.Cursor);
    this._invChunk.addEntity(this._cursor);
  }

  get container(): Container { return this._invChunk.container }

  take(target: Entity) {
    this._world.eval(actTransfer(this._player.id, target.chunk.id, target.id, this._invChunk.id, this._invSlot, 0));
  }

  put(chunk: Chunk, x: number, y: number) {
    let target = topWithVar(this._invChunk, Var.Portable, this._invSlot, 0);
    this._world.eval(actTransfer(this._player.id, this._invChunk.id, target.id, chunk.id, x, y));
  }

  select(slot: number) {
    if (slot < 0 || slot > 9) {
      throw "invalid inventory slot";
    }
    this._invSlot = slot;
    this._cursor.move(this._invSlot, 0);
  }
}
