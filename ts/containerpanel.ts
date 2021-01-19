import { Container, Graphics } from "pixi.js";
import { Chunk } from "./chunk";
import { Panel, PanelOwner } from "./eden";
import { Key } from "./key";
import { _eval } from "./script/eval";
import { $, $$ } from "./script/script";
import { isScope, Scope } from "./script/scope";
import { parse } from "./script/kurt";

import containereditor_kurt from "./containereditor.kurt";

export class ContainerPanel implements Panel {
  private _container: Container;
  private _editor: Scope;

  constructor(private _contChunk: Chunk, private _owner: PanelOwner) {
    _eval(_owner.world, parse(containereditor_kurt)); // TODO: Do this only once.

    this._container = new Container();
    this._container.setTransform(64 * 4, 64 * 4);

    this._editor = isScope(_eval(_owner.world, [[$('ContainerEditor'), $$('make')], _contChunk]));

    let bg = new Graphics();
    bg.beginFill(0, 0.5);
    bg.drawRect(0, 0, 16 * 10 * 4, 16 * 10 * 4);
    bg.endFill();
    this._container.addChild(bg);
    this._container.addChild(_contChunk.container);
  }

  get container(): Container {
    return this._container;
  }

  tick(): void {
    this._contChunk.render(0, 0, 4);
  }

  keyDown(evt: KeyboardEvent): void {
    switch (evt.keyCode) {
      case Key.ESCAPE: this.close(); break;
      case Key.W: this.moveCursor(0, -1); break;
      case Key.S: this.moveCursor(0, 1); break;
      case Key.A: this.moveCursor(-1, 0); break;
      case Key.D: this.moveCursor(1, 0); break;
      case Key.SPACE:
        _eval(this._owner.world, [[this._editor, $$('toggle')]]);
        break;
    }
  }

  private close() {
    this._owner.popPanel();
    _eval(this._owner.world, [[this._editor, $$('close')]]);
  }

  private moveCursor(dx: number, dy: number) {
    _eval(this._owner.world, [[this._editor, $$('move-cursor')], dx, dy]);
  }
}
