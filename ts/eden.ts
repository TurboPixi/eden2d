import { Application } from "pixi.js";
import { Entity, player, tile, wall } from "./entity";
import { Key } from "./key";
import { Map } from "./map";
import { Resources } from "./res";

class Eden {
  private _app: Application;
  private _map: Map;
  private _player: Entity;

  constructor() {
    this._app = new Application({
      backgroundColor: 0x1099bb
    });
    this._app.resizeTo = window;

    document.body.appendChild(this._app.view);
    document.addEventListener('keydown', (evt) => this.keyDown(evt), true);

    new Resources(() => {
      this._map = new Map(this._app, 16, 16);

      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          this._map.addEntity(new Entity(tile), x, y);
        }
      }
      this._map.addEntity(new Entity(wall), 0, 0)

      this._player = new Entity(player);
      this._map.addEntity(this._player);
      this.move(2, 2);

      this._app.stage.interactive = true;
      this._app.ticker.add(() => this.tick())
      this._app.start();
    });
  }

  private keyDown(evt: KeyboardEvent) {
    switch (evt.keyCode) {
      case Key.W: this.move(0, -1); break;
      case Key.S: this.move(0, 1); break;
      case Key.A: this.move(-1, 0); break;
      case Key.D: this.move(1, 0); break;
    }
  }

  private move(dx: number, dy: number) {
    this._player.move(this._player.x + dx, this._player.y + dy);
  }

  private tick() {
    this._map.x = (this._player.x - 4) * 16;
    this._map.y = (this._player.y - 4) * 16;
    this._map.tick();
  }
}

new Eden();
