import { Application } from "pixi.js";
import { Chunk } from "./chunk";
import { Entity, isEntity } from "./entity";
import { Key } from "./key";
import { Resources } from "./res";
import { evaluate, _eval } from "./script/eval";
import { _print } from "./script/print";
import { _root } from "./script/scope";
import { $, $$, _blk, _def, _do } from "./script/script";
import { World } from "./world";
import { builtins } from "./script/builtins";
import { UI } from "./ui";

class Eden {
  private _app: Application;
  private _world: World;
  private _ui: UI;
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
    evaluate(_root, builtins);
    this._world = new World();
    this._ui = new UI(this._world);

    let chunk = this.createChunk();
    this._player = isEntity(evaluate(this._world, [$('player-make'), chunk]));
    this.showChunk(chunk);

    let invChunk = evaluate(this._world, [[$('Player'), $$('contents')], this._player]) as Chunk;
    this._app.stage.addChild(invChunk.container);

    this._app.stage.interactive = true;
    this._app.ticker.add(() => this.tick())
    this._app.start();
  }

  private createChunk(): Chunk {
    let chunk0 = this._world.toyChunk();
    let chunk1 = this._world.toyChunk();
    evaluate(this._world, [[$('Stairs'), $$('make')], chunk0, 1, 5, chunk1, 0, 5, false]);
    evaluate(this._world, [[$('Stairs'), $$('make')], chunk1, 1, 5, chunk0, 2, 5, true]);
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
      case Key.G: evaluate(this._world, [[$('Player'), $$('follow')], this._player]); break;

      // Create.
      case Key.C:
        evaluate(this._world, [[[$('Player'), $$('add-inv')], this._player, [[$('Key'), $$('make')]]]]);
        break;
      case Key.V:
        evaluate(this._world, [[[$('Player'), $$('add-inv')], this._player, [[$('Crate'), $$('make')]]]]);
        break;

      // Take, put.
      case Key.T: evaluate(this._world, [[$('Player'), $$('take')], this._player]); break;
      case Key.P: evaluate(this._world, [[$('Player'), $$('put')], this._player]); break;

      // Selection.
      case Key._1: case Key._2: case Key._3: case Key._4:
      case Key._5: case Key._6: case Key._7: case Key._8: case Key._9:
        this.select(evt.keyCode - Key._1)
        break;
      case Key._0:
        this.select(9);
        break;
    }
  }

  private move(dx: number, dy: number) {
    evaluate(this._world, [[$('Player'), $$('move')], this._player, dx, dy]);
  }

  private select(slot: number) {
    evaluate(this._world, [[$('Player'), $$('select')], this._player, slot]);
  }

  private tick() {
    // Follow the player across chunks.
    let chunk = this._player.chunk;
    if (chunk != this._chunk) {
      this.showChunk(chunk);
    }

    let w = this._app.view.width;
    let h = this._app.view.height;

    let inv = evaluate(this._world, [[$('Player'), $$('contents')], this._player]) as Chunk;
    inv.render(0, 0, 4);

    let px = this._player.loc().x;
    let py = this._player.loc().y;
    let x = (px - 4) * 16;
    let y = (py - 4) * 16;
    this._chunk.render(x, y, 4);
  }
}

new Eden();
