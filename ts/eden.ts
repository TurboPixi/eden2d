import { Application } from "pixi.js";
import { Chunk, ChunkId } from "./chunk";
import { Entity, EntityType, Var } from "./entity";
import { Key } from "./key";
import { newPlayer } from "./player";
import { Resources } from "./res";
import { builtins, _new } from "./script/builtins";
import { evaluate, _, _func, _get, _self, _set } from "./script/script";
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

    // Put built-ins in the world scope.
    for (let def of builtins) {
      evaluate(this._world, def);
    }

    let chunk = this.createChunk();
    this._player = newPlayer(this._world, chunk);
    this.showChunk(chunk);

    let invChunk = evaluate(this._chunk, [_get, this._player, Var.Contents]) as Chunk;
    this._app.stage.addChild(invChunk.container);

    this._app.stage.interactive = true;
    this._app.ticker.add(() => this.tick())
    this._app.start();
  }

  private createChunk(): Chunk {
    let chunk0 = this._world.toyChunk();
    let chunk1 = this._world.toyChunk();

    evaluate(chunk0, [_('portal'), EntityType.StairDown, chunk0, 1, 5, chunk1, 0, 5]);
    evaluate(chunk1, [_('portal'), EntityType.StairUp, chunk1, 1, 5, chunk0, 2, 5]);
    evaluate(chunk1, [_set, _self, 'foo', [_func, [], [_new, chunk1, EntityType.ObjectCrate]]]);
    return chunk0;
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
      case Key.G: evaluate(this._player, [_('player:follow'), this._player]); break;

      // Create.
      case Key.C: evaluate(this._player, [_('player:create'), this._player, EntityType.ObjectKey]); break;

      // Take, put.
      case Key.T: evaluate(this._player, [_('player:take'), this._player]); break;
      case Key.P: evaluate(this._player, [_('player:put'), this._player]); break;

      // Selection.
      case Key._1: case Key._2: case Key._3: case Key._4:
      case Key._5: case Key._6: case Key._7: case Key._8: case Key._9:
        this.select(evt.keyCode - Key._1)
        break;
      case Key._0:
        this.select(9);
        break;

      case Key.Q:
        evaluate(this._player, [_('foo'), {}]);
        break;
    }
  }

  private move(dx: number, dy: number) {
    evaluate(this._player, [_('player:move'), { player: this._player, dx: dx, dy: dy }]);
  }

  private select(slot: number) {
    evaluate(this._player, [_('player:select'), this._player, slot]);
  }

  private tick() {
    // Follow the player across chunks.
    if (this._player.chunk != this._chunk) {
      this.showChunk(this._player.chunk);
    }

    let w = this._app.view.width;
    let h = this._app.view.height;

    let inv = this._player.ref(Var.Contents) as Chunk;
    inv.container.setTransform(0, h - 64, 4, 4);

    let x = (this._player.x - 4) * 16;
    let y = (this._player.y - 4) * 16;
    this._chunk.tick(x, y, 4, w, h);
  }
}

new Eden();
