import { Application, Container } from "pixi.js";
import { Entity } from "./entity";
import { Layer, Tile } from "./layer";

export enum GroundType {
  Empty = 0,
  TileBlue = 1,
  WallBlue = 2,
}

export interface Cell {
  ground: GroundType;
}

export class Map {
  private _cells: Cell[];
  private _entities: { [id: number]: Entity } = {};
  private _nextId = 1;

  private _container: Container;
  private _ground: Layer;

  private _x = 0;
  private _y = 0;
  private _z = 4;

  constructor(private app: Application, private width: number, private height: number) {
    this.clearCells();

    this._container = new Container();
    this.app.stage.addChild(this._container);
    this._ground = new Layer(this._container, width, height);

    this.updateLayers();
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get z(): number { return this._z; }
  set x(x: number) { this._x = x; }
  set y(y: number) { this._y = y; }
  set z(z: number) { this._z = z; }

  addEntity(entity: Entity) {
    if (entity._map && entity._map != this) {
      entity._map.removeEntity(entity);
    }

    if (entity._id in this._entities) {
      if (this._entities[entity._id] != entity) {
        throw "inconsistent entity id";
      }
      return;
    }

    entity._map = this;
    entity._id = this._nextId++;
    this._entities[entity._id] = entity;

    this._container.addChild(entity._spr);
  }

  removeEntity(entity: Entity) {
    if (entity._map != this) {
      return;
    }

    if (this._entities[entity._id] != entity) {
      throw "inconsistent entity id";
    }

    delete this._entities[entity._id];
    entity._map = null;

    this._container.removeChild(entity._spr);
  }

  tick() {
    let w = this.app.view.width;
    let h = this.app.view.height;
    let x = this._x * this._z;
    let y = this._y * this._z;
    this._container.setTransform(-x, -y, this._z, this._z);
    this._ground.tick(x, y, this._z, w, h);
  }

  private clearCells() {
    this._cells = [];
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        this._cells.push({
          ground: GroundType.Empty,
        });
      }
    }
  }

  private updateLayers() {
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        this._ground.setTile(x, y, Tile.TileBlue0);
      }
    }
    this._ground.setTile(1, 1, Tile.WallBlue0);
  }
}
