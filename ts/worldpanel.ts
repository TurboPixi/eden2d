import { Container, Graphics } from "pixi.js";
import { Chunk, isChunk } from "./chunk";
import { ContainerPanel } from "./containerpanel";
import { Panel, PanelOwner } from "./eden";
import { Entity, isEntity } from "./entity";
import { Key } from "./key";
import { _eval } from "./script/eval";
import { $, $$ } from "./script/script";

export class WorldPanel implements Panel {
  private _container: Container;
  private _chunk: Chunk;
  private _invChunk: Chunk;
  private _player: Entity;

  constructor(private _owner: PanelOwner) {
    let world = this._owner.world;
    let chunk = this.createChunk();
    this._player = isEntity(_eval(world, [$('player-make'), chunk]));

    this._invChunk = _eval(world, [[$('Player'), $$('contents')], this._player]) as Chunk;

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

  private createChunk(): Chunk {
    let world = this._owner.world;
    let chunk0 = world.toyChunk();
    let chunk1 = world.toyChunk();
    _eval(world, [[$('Stairs'), $$('make')], chunk0, 1, 5, chunk1, 0, 5, false]);
    _eval(world, [[$('Stairs'), $$('make')], chunk1, 1, 5, chunk0, 2, 5, true]);
    _eval(world, [[chunk0, $$('add')], [[$('Wand'), $$('make')]]]);
    return chunk0;
  }

  private openContainer(chunk: Chunk) {
    this._owner.showPanel(new ContainerPanel(chunk, this._owner));
  }

  private move(dx: number, dy: number) {
    _eval(this._owner.world, [[this._player, $$('move')], dx, dy]);
  }

  private select(slot: number) {
    _eval(this._owner.world, [[$('Player'), $$('select')], this._player, slot]);
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
    let world = this._owner.world;

    switch (evt.keyCode) {
      // Move.
      case Key.UP: case Key.W: this.move(0, -1); break;
      case Key.DOWN: case Key.S: this.move(0, 1); break;
      case Key.LEFT: case Key.A: this.move(-1, 0); break;
      case Key.RIGHT: case Key.D: this.move(1, 0); break;

      // Go.
      case Key.ENTER: _eval(world, [[$('Player'), $$('follow')], this._player]); break;

      // Use.
      case Key.Q: _eval(world, [[$('Player'), $$('use-item')], this._player]); break;

      // Open
      case Key.E:
        let chunk = isChunk(_eval(world, [[$('Player'), $$('open-item')], this._player]));
        if (chunk) {
          this.openContainer(chunk);
        }
        break;

      // Take, put.
      case Key.SPACE: _eval(world, [[$('Player'), $$('take')], this._player]); break;
      case Key.R: _eval(world, [[$('Player'), $$('put')], this._player]); break;

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
