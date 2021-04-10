import { Container, Graphics } from "pixi.js";
import { Chunk } from "../chunk";
import { ProgPanel } from "./progpanel";
import { Panel, PanelOwner } from "../eden";
import { Entity, isEntity } from "../entity";
import { Key } from "./key";
import { Dict, dictDef, isDict, _root } from "../script/dict";
import { _eval } from "../script/eval";
import { $, $$, EExpr, _ } from "../script/script";

import worldpanel_kurt from "./worldpanel.kurt";
import { _parse } from "../script/parse";

enum InputState {
  default = 0,
  use = 1,
  open = 2,
}

export class WorldPanel implements Panel {
  private _container: Container;
  private _chunk: Chunk;
  private _invChunk: Chunk;
  private _player: Entity;
  private _impl: Dict;
  private _inputState: InputState = InputState.default;

  constructor(private _owner: PanelOwner) {
    _eval(_root, _parse('worldpanel.kurt', worldpanel_kurt)); // TODO: Do this only once.
    this._impl = isDict(_eval(_root, [[$('WorldPanel'), $$('make')]]));

    let chunk = this.createChunk();
    this._player = isEntity(this.eval([[_(chunk), $$('add')], [[$('Player'), $$('make')]]]));
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

  private createChunk(): Chunk {
    let chunk0 = this.call('toy-chunk') as Chunk;
    let chunk1 = this.call('toy-chunk') as Chunk;
    this.call('make-items', chunk0, chunk1);
    return chunk0;
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
    switch (this._inputState) {
      case InputState.default:
        this.defaultKey(evt);
        break;

      case InputState.use:
        this.useKey(evt);
        break;

      case InputState.open:
        this.openKey(evt);
        break;
    }
  }

  private defaultKey(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      case Key.UP:    this.call('move',  0, -1); break;
      case Key.DOWN:  this.call('move',  0,  1); break;
      case Key.LEFT:  this.call('move', -1,  0); break;
      case Key.RIGHT: this.call('move',  1,  0); break;

      case Key.ENTER: this.call('enter');   break;
      case Key.SPACE: this.call('take');    break;
      case Key.R:     this.call('put');     break;

      case Key.E:     this.progSelected();                break;
      case Key.Q:     this._inputState = InputState.use;  break;
      case Key.O:     this._inputState = InputState.open; break;

      case Key._1: case Key._2: case Key._3:
      case Key._4: case Key._5: case Key._6:
      case Key._7: case Key._8: case Key._9: this.call('select-inv', evt.keyCode - Key._1); break;
      case Key._0:                           this.call('select-inv', 9);                    break;

      case Key.F1: this.call('save'); evt.preventDefault(); break;
    }
  }

  private useKey(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      case Key.UP:    this.call('use-selected',  0, -1); break;
      case Key.DOWN:  this.call('use-selected',  0,  1); break;
      case Key.LEFT:  this.call('use-selected', -1,  0); break;
      case Key.RIGHT: this.call('use-selected',  1,  0); break;
    }
    this._inputState = InputState.default;
  }

  private openKey(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      case Key.UP:    this.call('open',  0, -1); break;
      case Key.DOWN:  this.call('open',  0,  1); break;
      case Key.LEFT:  this.call('open', -1,  0); break;
      case Key.RIGHT: this.call('open',  1,  0); break;
    }
    this._inputState = InputState.default;
  }

  private progSelected() {
    let programmed = this.call('selected-programmed');
    if (programmed) {
      this._owner.showPanel(new ProgPanel(programmed, this._owner));
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
}
