import { Application } from "pixi.js";
import { actCreate, Actions, ActionType, actMove } from "./actions";
import { Entity, EntityId, EntityType } from "./entity";
import { Key } from "./key";
import { Map } from "./map";
import { ImageKey, Resources } from "./res";

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

    Resources.load(() => {
      this._map = toyMap(this._app);

      let playerId = Actions.eval(this._map, actCreate(EntityId.System, EntityType.Player, 1, 1))
      this._player = this._map.entity(playerId);
      this._map.addEntity(this._player);

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
    Actions.eval(this._map, actMove(EntityId.System, this._player.id, dx, dy));
  }

  private tick() {
    this._map.x = (this._player.x - 4) * 16;
    this._map.y = (this._player.y - 4) * 16;
    this._map.tick();
  }
}

function toyMap(app: Application): Map {
  let map = new Map(app, 16, 16);

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      Actions.eval(map, actCreate(EntityId.System, EntityType.TileBlue, x, y))
    }
  }

  for (let x = 1; x < 9; x++) {
    Actions.eval(map, actCreate(EntityId.System, EntityType.WallBlue, x, 0))
  }

  return map;
}

new Eden();
