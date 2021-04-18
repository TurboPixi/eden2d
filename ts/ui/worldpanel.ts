import { Container, Graphics } from "pixi.js";
import { Chunk, isChunk } from "../chunk";
import { Panel, PanelOwner } from "../eden";
import { Entity, isEntity } from "../entity";
import { Key } from "./keys";
import { Dict, dictDef, isDict, _root } from "../script/dict";
import { _eval } from "../script/eval";
import { $, $$, EExpr, _ } from "../script/script";

export class WorldPanel implements Panel {
  private _container: Container;
  private _chunk: Chunk;
  private _invChunk: Chunk;
  private _player: Entity;
  private _impl: Dict;

  constructor(private _owner: PanelOwner) {
    this._impl = isDict(_eval(_root, [[[$('UI'), $$('WorldPanel')], $$('make')]]));

    let chunk = isChunk(this.call('create-chunk'));
    this._player = isEntity(this.eval([[_(chunk), $$('add')], [[[$('Actors'), $$('Player')], $$('make')]]]));
    dictDef(this._impl, $('player'), this._player as Dict); // copy into impl

    let bg = new Graphics();
    bg.beginFill(0, 0.5);
    bg.drawRect(0, 0, 16 * 10 * 4, 16 * 4);
    bg.endFill();

    this._container = new Container();
    this._container.addChild(bg);

    this._invChunk = this.eval([_(this._player), $$('player')], $$('contents')) as Chunk;
    this._container.addChild(this._invChunk.container);

    this.showChunk(chunk);
  }

  get container(): Container {
    return this._container;
  }

  tick(deltaMillis: number): void {
    // Follow the player across chunks.
    let chunk = this._player.chunk;
    if (chunk != this._chunk) {
      this.showChunk(chunk);
    }

    this._invChunk.tick(deltaMillis);
    this._invChunk.render(0, 0, 4);

    this._chunk.tick(deltaMillis);
    let px = this._player.loc.x;
    let py = this._player.loc.y;
    let x = (px - 4) * 16;
    let y = (py - 4) * 16;
    this._chunk.render(x, y, 4);
  }

  keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      default:
        this.call('key-down', evt.keyCode);
        break;

      // Save/load freezing experiment. Doesn't actually work right yet.
      case Key.F1:
        this.call('save');
        evt.preventDefault();
        break;
      case Key.F2:
        evt.preventDefault();
        console.log(this.call('load'));
        break;
    }
  }

  private showChunk(chunk: Chunk) {
    if (this._chunk) {
      this._container.removeChild(this._chunk.container);
    }
    this._chunk = chunk;
    dictDef(this._impl, $('chunk'), chunk as Dict); // copy into impl
    this._container.addChildAt(this._chunk.container, 0);
  }

  private call(blockName: string, ...expr: EExpr[]): EExpr {
    return this.eval([_(this._impl), $$(blockName)], ...expr);
  }

  private eval(...expr: EExpr[]): EExpr {
    return _eval(_root, expr);
  }

  // TODO: Reimplement this in kurt -- need to expose show-chunk.
  // private progSelected() {
  //   let programmed = this.call('selected-programmed');
  //   if (programmed) {
  //     this._owner.showPanel(new ProgPanel(programmed, this._owner));
  //   }
  // }
}
