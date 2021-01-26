import { Container, Graphics } from "pixi.js";
import { Chunk, isChunk } from "./chunk";
import { ContainerPanel } from "./containerpanel";
import { Panel, PanelOwner } from "./eden";
import { Entity, isEntity } from "./entity";
import { Key } from "./key";
import { _eval } from "./script/eval";
import { $, $$, EExpr, nil } from "./script/script";
import { World } from "./world";

export class WorldPanel implements Panel {
  private _world: World;
  private _container: Container;
  private _chunk: Chunk;
  private _invChunk: Chunk;
  private _player: Entity;

  constructor(private _owner: PanelOwner) {
    this._world = this._owner.world;

    let chunk = this.createChunk();
    this._player = isEntity(this.eval($('player-make'), chunk));

    this._invChunk = this.eval([$('Player'), $$('contents')], this._player) as Chunk;

    this._container = new Container();

    let bg = new Graphics();
    bg.beginFill(0, 0.5);
    bg.drawRect(0, 0, 16 * 10 * 4, 16 * 4);
    bg.endFill();

    this._container.addChild(bg);
    this._container.addChild(this._invChunk.container);

    this.showChunk(chunk);
  }

  get container(): Container {
    return this._container;
  }

  private eval(...expr: EExpr[]): EExpr {
    return _eval(this._world, expr);
  }

  private createChunk(): Chunk {
    let chunk0 = this._world.toyChunk();
    let chunk1 = this._world.toyChunk();
    this.eval([$('Stairs'), $$('make')], chunk0, 1, 5, chunk1, 0, 5, false);
    this.eval([$('Stairs'), $$('make')], chunk1, 1, 5, chunk0, 2, 5, true);
    this.eval([chunk0, $$('add')], [[$('Wand'), $$('make')]]);
    return chunk0;
  }

  private openContainer(chunk: Chunk) {
    this._owner.showPanel(new ContainerPanel(chunk, this._owner));
  }

  private move(dx: number, dy: number) {
    this.eval([this._player, $$('perform')], [$('action-move'), dx, dy]);
  }

  private useSelected() {
    let selected = this.eval([[this._player, $$('player')], $$('selected-item')]);
    if (selected !== nil) {
      this.eval([selected, $$('perform')], [$('action-use'), this._player]);
    }
  }

  private select(slot: number) {
    this.eval([$('Player'), $$('select')], this._player, slot);
  }

  tick(): void {
    // Follow the player across chunks.
    let chunk = this._player.chunk;
    if (chunk != this._chunk) {
      this.showChunk(chunk);
    }

    this._invChunk.render(0, 0, 4);

    let px = this._player.loc().x;
    let py = this._player.loc().y;
    let x = (px - 4) * 16;
    let y = (py - 4) * 16;
    this._chunk.render(x, y, 4);
  }

  keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      // Move.
      case Key.UP: case Key.W: this.move(0, -1); break;
      case Key.DOWN: case Key.S: this.move(0, 1); break;
      case Key.LEFT: case Key.A: this.move(-1, 0); break;
      case Key.RIGHT: case Key.D: this.move(1, 0); break;

      // Go.
      case Key.ENTER: this.eval([$('Player'), $$('follow')], this._player); break;

      // Use.
      case Key.Q: this.useSelected(); break;

      // Open
      case Key.E:
        let chunk = isChunk(this.eval([$('Player'), $$('open-item')], this._player));
        if (chunk) {
          this.openContainer(chunk);
        }
        break;

      // Take, put.
      case Key.SPACE: this.eval([$('Player'), $$('take')], this._player); break;
      case Key.R: this.eval([$('Player'), $$('put')], this._player); break;

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

  private showChunk(chunk: Chunk) {
    if (this._chunk) {
      this._container.removeChild(this._chunk.container);
    }
    this._chunk = chunk;
    this._container.addChildAt(this._chunk.container, 0);
  }
}
