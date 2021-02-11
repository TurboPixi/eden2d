import { Container, Graphics } from "pixi.js";
import { Chunk } from "../chunk";
import { Panel, PanelOwner } from "../eden";
import { Key } from "./key";
import { _eval } from "../script/eval";
import { $, $$, EExpr, nil } from "../script/script";
import { Dict, isDict } from "../script/dict";

import containerpanel_kurt from "./progpanel.kurt";
import { _parse } from "../script/parse";

export class ProgPanel implements Panel {
  private _container: Container;
  private _progChunk: Chunk;
  private _impl: Dict;

  constructor(programmed: EExpr, private _owner: PanelOwner) {
    _eval(_owner.world, _parse('progpanel.kurt', containerpanel_kurt)); // TODO: Do this only once.

    this._progChunk = _eval(_owner.world, [programmed, $$('program')]) as Chunk;

    this._container = new Container();
    this._container.setTransform(64 * 4, 64 * 4);

    this._impl = isDict(_eval(_owner.world, [[$('ProgPanel'), $$('make')], this._progChunk, 10, 10]));

    let bg = new Graphics();
    bg.beginFill(0, 0.5);
    bg.drawRect(0, 0, 16 * 10 * 4, 16 * 10 * 4);
    bg.endFill();
    this._container.addChild(bg);
    this._container.addChild(this._progChunk.container);
  }

  get container(): Container {
    return this._container;
  }

  tick(deltaMillis: number): void {
    this._progChunk.render(0, 0, 4);
  }

  keyDown(evt: KeyboardEvent): void {
    let writeType: EExpr = nil;

    switch (evt.keyCode) {
      case Key.W:     this.call('move-cursor', 0, -1); break;
      case Key.S:     this.call('move-cursor', 0, 1); break;
      case Key.A:     this.call('move-cursor', -1, 0); break;
      case Key.D:     this.call('move-cursor', 1, 0); break;
      case Key.SPACE: this.call('erase'); break;
      case Key.Q:     writeType = $$('squiggle'); break;

      case Key.BACK_SLASH:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('block-vert');
          else             writeType = $$('block-horz');
        }
        break;

      case Key.SEMI_COLON:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('quote-vert');
          else             writeType = $$('quote-horz');
        }
        break;

      case Key._9:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('round-open-vert');
          else             writeType = $$('round-open-horz');
        }
        break;

      case Key._0:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('round-close-vert');
          else             writeType = $$('round-close-horz');
        }
        break;

      case Key.OPEN_BRACKET:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('curly-open-vert');
          else             writeType = $$('curly-open-horz');
        } else {
          if (evt.ctrlKey) writeType = $$('square-open-vert');
          else             writeType = $$('square-open-horz');
        }
        break;

      case Key.CLOSE_BRACKET:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('curly-close-vert');
          else             writeType = $$('curly-close-horz');
        } else {
          if (evt.ctrlKey) writeType = $$('square-close-vert');
          else             writeType = $$('square-close-horz');
        }
        break;

      case Key.ESCAPE:
        this.call('close');
        this._owner.popPanel();
        break;
    }

    if (writeType !== nil) {
      this.call('write', writeType);
    }
  }

  private call(blockName: string, ...expr: EExpr[]): EExpr {
    return _eval(this._owner.world, [[this._impl, $$(blockName)], ...expr]);
  }
}
