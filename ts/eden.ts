import { Application } from "pixi.js";
import { actCreate, Actions, actMove, actTransfer } from "./actions";
import { Chunk } from "./chunk";
import { Entity, EntityId, EntityType, Var } from "./entity";
import { Key } from "./key";
import { Resources } from "./res";
import { World } from "./world";

class Eden {
  private _app: Application;
  private _world: World;
  private _chunk: Chunk;
  private _player: Entity;
  private _invSlot = 0;

  constructor() {
    this._app = new Application({ backgroundColor: 0x1099bb });
    this._app.resizeTo = window;

    document.body.appendChild(this._app.view);
    document.addEventListener('keydown', (evt) => this.keyDown(evt), true);

    Resources.load(() => this.ready());
  }

  private ready() {
    this._world = new World();

    this.createChunk();
    this._player = this.createPlayer();

    this._app.stage.interactive = true;
    this._app.ticker.add(() => this.tick())
    this._app.start();
  }

  private createChunk() {
    this._chunk = this._world.toyChunk();
    this._app.stage.addChild(this._chunk.container);
  }

  private createPlayer(): Entity {
    let playerId = Actions.eval(this._world, actCreate(EntityId.System, this._chunk.id, EntityType.Player, 1, 1))
    let player = this._chunk.entity(playerId);
    this._chunk.addEntity(player);

    let inv = this._world.newChunk(10, 1);
    player.setChunk(Var.Contents, inv.id)
    this._app.stage.addChild(inv.container);

    return player;
  }

  private keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      // Move.
      case Key.W: this.move(0, -1); break;
      case Key.S: this.move(0, 1); break;
      case Key.A: this.move(-1, 0); break;
      case Key.D: this.move(1, 0); break;

      // Create.
      case Key.C: this.create(EntityType.ObjectKey); break;

      // Take, put.
      case Key.T: this.take(); break;
      case Key.P: this.put(); break;

      // Selection.
      case Key._0: this.selectInv(9); break;
      case Key._1: case Key._2: case Key._3: case Key._4:
      case Key._5: case Key._6: case Key._7: case Key._8: case Key._9:
        this.selectInv(evt.keyCode - Key._1)
        break;
    }
  }

  private move(dx: number, dy: number) {
    Actions.eval(this._world, actMove(EntityId.System, this._chunk.id, this._player.id, dx, dy));
  }

  private take() {
    let x = this._player.x;
    let y = this._player.y;
    let target = topPortable(this._chunk, x, y);
    if (target) {
      Actions.eval(this._world, actTransfer(this._player.id, this._chunk.id, target, this._player.getChunk(Var.Contents), this._invSlot, 0));
    }
  }

  private put() {
    let invChunkId = this._player.getChunk(Var.Contents);
    let invChunk = this._world.chunk(invChunkId);
    let target = topPortable(invChunk, this._invSlot, 0);
    if (target) {
      let x = this._player.x;
      let y = this._player.y;
      Actions.eval(this._world, actTransfer(this._player.id, invChunkId, target, this._chunk.id, x, y));
    }
  }

  private create(typ: EntityType) {
    Actions.eval(this._world, actCreate(this._player.id, this._chunk.id, typ, this._player.x, this._player.y));
  }

  private selectInv(slot: number) {
    if (slot < 0 || slot > 9) {
      throw "invalid inventory slot";
    }
    this._invSlot = slot;
    // TODO: Something visual.
  }

  private tick() {
    let w = this._app.view.width;
    let h = this._app.view.height;

    let invId = this._player.getChunk(Var.Contents);
    this._world.chunk(invId).container.setTransform(0, h - 64, 4, 4);

    let x = (this._player.x - 4) * 16;
    let y = (this._player.y - 4) * 16;
    this._chunk.tick(x, y, 4, w, h);
  }
}

function topPortable(chunk: Chunk, x: number, y: number): EntityId {
  let ents = chunk.entitiesAt(x, y);
  for (var ent of ents) {
    if (ent.getBool(Var.Portable)) {
      return ent.id;
    }
  }
  return EntityId.Unknown;
}

new Eden();
