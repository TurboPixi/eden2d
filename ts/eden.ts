import { Application } from "pixi.js";
import { Chunk } from "./chunk";
import { Entity, EntityId, EntityType, Var } from "./entity";
import { Inventory } from "./inventory";
import { Key } from "./key";
import { Resources } from "./res";
import { World } from "./world";

class Eden {
  private _app: Application;
  private _world: World;
  private _chunk: Chunk;
  private _player: Entity;
  private _inv: Inventory;

  constructor() {
    this._app = new Application({ backgroundColor: 0x1099bb });
    this._app.resizeTo = window;

    document.body.appendChild(this._app.view);
    document.addEventListener('keydown', (evt) => this.keyDown(evt), true);

    Resources.load(() => this.ready());
  }

  private ready() {
    this._world = new World();

    let chunk = this.createChunk();
    this._player = this.createPlayer(chunk);
    this.showChunk(this._player.chunk);

    this._app.stage.interactive = true;
    this._app.ticker.add(() => this.tick())
    this._app.start();
  }

  private createChunk(): Chunk {
    let chunk0 = this._world.toyChunk();
    let chunk1 = this._world.toyChunk();

    this._world.eval(['portal', { type: EntityType.StairDown, from: chunk0.id, fx: 1, fy: 5, to: chunk1.id, tx: 0, ty: 5 }]);
    this._world.eval(['portal', { type: EntityType.StairUp, from: chunk1.id, fx: 1, fy: 5, to: chunk0.id, tx: 2, ty: 5 }]);
    return chunk0;
  }

  private createPlayer(chunk: Chunk): Entity {
    let playerId = this._world.eval(['new', { chunk: chunk.id, type: EntityType.Player, x: 1, y: 1 }]) as EntityId;

    let player = chunk.entity(playerId);
    chunk.addEntity(player);

    this._inv = new Inventory(this._world, player);
    this._app.stage.addChild(this._inv.container);
    return player;
  }

  private showChunk(chunk: Chunk) {
    if (this._chunk) {
      this._app.stage.removeChild(this._chunk.container);
    }
    this._chunk = chunk;
    this._app.stage.addChild(this._chunk.container);
  }

  private keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      // Move.
      case Key.UP: case Key.W: this.move(0, -1); break;
      case Key.DOWN: case Key.S: this.move(0, 1); break;
      case Key.LEFT: case Key.A: this.move(-1, 0); break;
      case Key.RIGHT: case Key.D: this.move(1, 0); break;

      // Go.
      case Key.G: this.go(); break;

      // Create.
      case Key.C: this.create(EntityType.ObjectKey); break;

      // Take, put.
      case Key.T: this.take(); break;
      case Key.P: this.put(); break;

      // Selection.
      case Key._0: this._inv.select(9); break;
      case Key._1: case Key._2: case Key._3: case Key._4:
      case Key._5: case Key._6: case Key._7: case Key._8: case Key._9:
        this._inv.select(evt.keyCode - Key._1)
        break;
    }
  }

  private move(dx: number, dy: number) {
    let x = this._player.x + dx;
    let y = this._player.y + dy;
    this._world.eval(['move', { ent: this._player.id, x: x, y: y }]) as EntityId;
  }

  private go() {
    this._world.eval(
      ['let', { portal: ['topWithVar', { chunk: this._chunk.id, x: this._player.x, y: this._player.y, var: Var.Portal }] }, [
        ['jump', { ent: this._player.id, chunk: ['get', ['portal'], Var.PortalChunk] }],
        ['move', { ent: this._player.id, x: ['get', ['portal'], Var.PortalX], y: ['get', ['portal'], Var.PortalY], }]
      ]]);
  }

  private take() {
    let x = this._player.x;
    let y = this._player.y;
    let target = this._world.eval(['topWithVar', { chunk: this._chunk.id, x: x, y: y, var: Var.Portable }]);
    if (target != null) {
      this._inv.take(target);
    }
  }

  private put() {
    let x = this._player.x;
    let y = this._player.y;
    this._inv.put(this._player.chunk, x, y);
  }

  private create(type: EntityType) {
    this._world.eval(['move', { ent: ['new', { chunk: this._chunk.id, type: type }], x: this._player.x, y: this._player.y }]);
  }

  private tick() {
    // Follow the player across chunks.
    if (this._player.chunk != this._chunk) {
      this.showChunk(this._player.chunk);
    }

    let w = this._app.view.width;
    let h = this._app.view.height;

    let invId = this._player.getVar(Var.Contents);
    this._world.chunk(invId).container.setTransform(0, h - 64, 4, 4);

    let x = (this._player.x - 4) * 16;
    let y = (this._player.y - 4) * 16;
    this._chunk.tick(x, y, 4, w, h);
  }
}

new Eden();
