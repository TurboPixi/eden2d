import { Container, Graphics } from "pixi.js";
import { Chunk } from "../chunk";
import { Panel, PanelOwner } from "../eden";
import { Key } from "./key";
import { _eval } from "../script/eval";
import { $, $$, EExpr } from "../script/script";
import { Dict, isDict } from "../script/dict";

import containerpanel_kurt from "./containerpanel.kurt";
import { _parse } from "../script/parse";

export class ContainerPanel implements Panel {
  private _container: Container;
  private _impl: Dict;

  constructor(private _contChunk: Chunk, private _owner: PanelOwner) {
    _eval(_owner.world, _parse('containerpanel.kurt', containerpanel_kurt)); // TODO: Do this only once.

    this._container = new Container();
    this._container.setTransform(64 * 4, 64 * 4);

    this._impl = isDict(_eval(_owner.world, [[$('ContainerPanel'), $$('make')], _contChunk, 10, 10]));

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

  tick(deltaMillis: number): void {
    this._contChunk.render(0, 0, 4);
  }

  keyDown(evt: KeyboardEvent): void {
    switch (evt.keyCode) {
      case Key.W:     this.call('move-cursor', 0, -1); break;
      case Key.S:     this.call('move-cursor', 0, 1); break;
      case Key.A:     this.call('move-cursor', -1, 0); break;
      case Key.D:     this.call('move-cursor', 1, 0); break;
      case Key.SPACE: this.call('toggle'); break;

      case Key.ESCAPE:
        this.call('close');
        this._owner.popPanel();
        break;
    }
  }

  private call(blockName: string, ...expr: EExpr[]): EExpr {
    return _eval(this._owner.world, [[this._impl, $$(blockName)], ...expr]);
  }
}
