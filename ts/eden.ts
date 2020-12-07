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
    Actions.eval(this._world, actCreate(player.id, inv.id, EntityType.ObjectKey, 0, 0));

    return player;
  }

  private keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      case Key.W: this.move(0, -1); break;
      case Key.S: this.move(0, 1); break;
      case Key.A: this.move(-1, 0); break;
      case Key.D: this.move(1, 0); break;
      case Key.C: this.create(EntityType.ObjectKey); break;
      case Key.T: this.take(); break;
    }
  }

  private move(dx: number, dy: number) {
    Actions.eval(this._world, actMove(EntityId.System, this._chunk.id, this._player.id, dx, dy));
  }

  private take() {
    let target = null; // TODO
    Actions.eval(this._world, actTransfer(this._player.id, this._chunk.id, target, this._player.getChunk(Var.Contents), 0, 0));
  }

  private create(typ: EntityType) {
    Actions.eval(this._world, actCreate(this._player.id, this._chunk.id, typ, this._player.x, this._player.y));
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

new Eden();
