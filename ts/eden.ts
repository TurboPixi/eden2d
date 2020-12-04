import { Application } from "pixi.js";
import { Entity, EntityType } from "./entity";
import { Key } from "./key";
import { Map } from "./map";
import { Resources } from "./res";

class Eden {
  private app: Application;
  private map: Map;
  private _player: Entity;

  constructor() {
    this.app = new Application({
      backgroundColor: 0x1099bb
    });
    this.app.resizeTo = window;

    document.body.appendChild(this.app.view);
    document.addEventListener('keydown', (evt) => this.keyDown(evt), true);

    let res = new Resources(() => {
      this.map = new Map(this.app, 16, 16);

      this._player = new Entity(EntityType.Player);
      this.map.addEntity(this._player);
      this._player.move(1, 2);

      this.app.ticker.add(() => this.tick())
      this.app.stage.interactive = true;
      this.app.start();
    });
  }

  private keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      case Key.W: this.map.y -= 16; break;
      case Key.S: this.map.y += 16; break;
      case Key.A: this.map.x -= 16; break;
      case Key.D: this.map.x += 16; break;
    }
  }

  private tick() {
    this.map.tick();
  }
}

new Eden();
