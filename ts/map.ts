import {
  Application,
  Container,
} from "pixi.js";
import { Layer } from "./layer";

export enum Ground {
  Empty = 0,
  WallBlue = 1,
}

export enum Thing {
  ChestSilver = 2,
}

export interface Tile {
  ground: Ground;
  things: Thing[];
}

export class Map {
  private tiles: Tile[];

  private container: Container;
  private terrain: Layer;
  private things: Layer;

  private x = 0;
  private y = 0;

  constructor(private app: Application, private width: number, private height: number) {
    this.container = new Container();
    this.app.stage.addChild(this.container);

    this.terrain = new Layer(this.container, width, height);
    this.things = new Layer(this.container, width, height);

    this.x = 128;
    this.y = 128;

    this.updateLayers();
  }

  tick() {
    let w = this.app.view.width;
    let h = this.app.view.height;
    this.terrain.tick(this.x, this.y, w, h);
    this.things.tick(this.x, this.y, w, h);
  }

  private updateLayers() {
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        this.terrain.setTile(x, y, 4, 4);
        this.things.setTile(x, y, 4, 4);
      }
    }

    this.terrain.setTile(1, 1, 0, 0);
    this.terrain.setTile(2, 1, 2, 0);
  }
}
