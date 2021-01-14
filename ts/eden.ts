import { Application } from "pixi.js";
import { Chunk, isChunk } from "./chunk";
import { Entity, EntityType, isEntity, VarChunk, VarPortal, VarX, VarY } from "./entity";
import { Key } from "./key";
import { Resources } from "./res";
import { evalBuiltins } from "./script/builtins";
import { evaluate, _eval } from "./script/eval";
import { _print } from "./script/print";
import { locNum, _root } from "./script/scope";
import { $, $$, _, _blk, _def, __ } from "./script/script";
import { World, _new } from "./world";
import { parse } from "./script/kurt";
import player_kurt from "./player.kurt";

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

    evalBuiltins();
    evaluate(this._world, parse(player_kurt));

    let chunk = this.createChunk();
    this._player = isEntity(evaluate(this._world, [[$('Player'), $$('make')], chunk]));
    this.showChunk(chunk);

    let invChunk = evaluate(this._chunk, [[$('Player'), $$('contents')], this._player]) as Chunk;
    this._app.stage.addChild(invChunk.container);

    this._app.stage.interactive = true;
    this._app.ticker.add(() => this.tick())
    this._app.start();
  }

  private createChunk(): Chunk {
    let chunk0 = this._world.toyChunk();
    let chunk1 = this._world.toyChunk();

    evaluate(this._world, [$(VarPortal), EntityType.StairDown, chunk0, 1, 5, chunk1, 0, 5]);
    evaluate(this._world, [$(VarPortal), EntityType.StairUp, chunk1, 1, 5, chunk0, 2, 5]);
    evaluate(this._world, [_def, $$('foo'), [_blk, _new, chunk1, EntityType.ObjectCrate]]);
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
      case Key.C: evaluate(this._world, [[$('Player'), $$('create')], this._player, EntityType.ObjectKey]); break;

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

      case Key.Q:
        evaluate(this._player, [$('foo'), {}]);
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
    let chunk = isChunk(_eval(this._player, $(VarChunk)));
    if (chunk != this._chunk) {
      this.showChunk(chunk);
    }

    let w = this._app.view.width;
    let h = this._app.view.height;

    let inv = evaluate(this._chunk, [[$('Player'), $$('contents')], this._player]) as Chunk;
    inv.container.setTransform(0, h - 64, 4, 4);

    let px = locNum(this._player, $(VarX));
    let py = locNum(this._player, $(VarY));
    let x = (px - 4) * 16;
    let y = (py - 4) * 16;
    this._chunk.tick(x, y, 4, w, h);
  }
}

new Eden();
// runTests();
