import {
  Application,
  Container,
} from "pixi.js";
import {
  ActorLayer,
  ActorTile,
  GroundLayer,
  GroundTile,
  Layer,
  ThingLayer,
  ThingTile,
} from "./layer";

export enum Ground {
  Empty = 0,
  TileBlue = 1,
  WallBlue = 2,
}

export enum Thing {
  ChestSilver = 2,
}

export interface Cell {
  ground: Ground;
  things: Thing[];
}

export class Map {
  private cells: Cell[];

  private container: Container;
  private ground: GroundLayer;
  private things: ThingLayer;
  private actors: ActorLayer;

  private x = 256;
  private y = 256;

  constructor(private app: Application, private width: number, private height: number) {
    this.clearCells();

    this.container = new Container();
    this.app.stage.addChild(this.container);

    this.ground = new GroundLayer(this.container, width, height);
    this.things = new ThingLayer(this.container, width, height);
    this.actors = new ActorLayer(this.container, width, height);

    this.updateLayers();
  }

  tick() {
    let w = this.app.view.width;
    let h = this.app.view.height;
    this.ground.tick(this.x, this.y, w, h);
    this.things.tick(this.x, this.y, w, h);
  }

  private clearCells() {
    this.cells = [];
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        this.cells.push({
          ground: Ground.Empty,
          things: [],
        });
      }
    }
  }

  private updateLayers() {
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        this.ground.setTile(x, y, GroundTile.Empty);
        this.things.setTile(x, y, ThingTile.Empty);
        this.actors.setTile(x, y, ActorTile.Empty);
      }
    }

    this.ground.setTile(1, 1, GroundTile.WallBlue0);
    this.ground.setTile(2, 1, GroundTile.TileBlue0);
    this.ground.setTile(2, 1, GroundTile.TileBlue0);
    this.ground.setTile(3, 1, GroundTile.TileBlue0);

    this.things.setTile(2, 1, ThingTile.ChestClosedLocked);

    this.actors.setTile(3, 1, ActorTile.Player0);
  }
}
