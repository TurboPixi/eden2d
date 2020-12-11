import { Container } from "pixi.js";
import { Chunk, ChunkId } from "./chunk";
import { Entity, EntityId, EntityType, Var } from "./entity";
import { World } from "./world";

export class Inventory {
  private _invSlot = 0;
  private _invChunk: Chunk;
  private _cursor: Entity;

  constructor(private _world: World, private _player: Entity) {
    this._invChunk = this._world.newChunk();
    _player.setVar(Var.Contents, this._invChunk.id)

    this._cursor = new Entity(EntityType.Cursor);
    this._invChunk.addEntity(this._cursor);
  }

  get container(): Container { return this._invChunk.container }

  take(target: EntityId) {
    this._world.eval([
      'move', {
        'ent': ['jump', { ent: target, chunk: this._invChunk.id }],
        'x': this._invSlot, 'y': 0
      }]);
  }

  put(chunk: ChunkId, x: number, y: number) {
    this._world.eval([
      'let', {
        'target': ['topWithVar', {
          chunk: this._invChunk.id,
          var: Var.Portable,
          x: this._invSlot, y: 0,
        }]
      }, [
        ['move', {
          'ent': ['jump', { ent: ['target'], chunk: chunk }],
          'x': x, 'y': y
        }]
      ]
    ]);
  }

  select(slot: number) {
    if (slot < 0 || slot > 9) {
      throw "invalid inventory slot";
    }
    this._invSlot = slot;
    this._cursor.move(this._invSlot, 0);
  }
}
