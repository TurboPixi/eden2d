import { Application, Container, Sprite, Ticker } from "pixi.js";
import { Key } from "./key";
import { Map } from "./map";

class Eden {
  private app: Application;
  private map: Map;

  constructor() {
    this.app = new Application({
      backgroundColor: 0x1099bb
    });
    this.app.resizeTo = window;

    document.body.appendChild(this.app.view);
    document.addEventListener('keydown', (evt) => this.keyDown(evt), true);

    this.map = new Map(this.app, 16, 16);
    this.app.ticker.add(() => this.tick())

    this.app.stage.interactive = true;
    this.app.start();
  }

  private keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      case Key.W:
        break;
    }
  }

  private tick() {
    this.map.tick();
  }
}

new Eden();
