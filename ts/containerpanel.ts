import { Container, Graphics } from "pixi.js";
import { Chunk } from "./chunk";
import { Panel, PanelOwner } from "./eden";

export class ContainerPanel implements Panel {
  private _container: Container;

  constructor(private _contChunk: Chunk, private _owner: PanelOwner) {
    this._container = new Container();
    this._container.setTransform(64 * 4, 64 * 4);

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
      case 27:
        this._owner.popPanel();
    }
  }
}
