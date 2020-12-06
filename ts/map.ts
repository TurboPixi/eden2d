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

const _groundTiles = {
  0: Tile.Empty,
  1: Tile.TileBlue0,
  2: Tile.WallBlue0,
}

export enum ActionType {
  Move = 1,
}

export interface Action {
  type: ActionType;
  actor: Entity;
  target: Entity;
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

  constructor(private app: Application, private _width: number, private _height: number) {
    this.clearCells();
    for (let y = 1; y < this._height - 2; y++) {
      for (let x = 1; x < this._width - 2; x++) {
        this.setGround(x, y, GroundType.TileBlue);
      }
    }
    this.setGround(1, 1, GroundType.WallBlue);
    this.setGround(2, 1, GroundType.WallBlue);
    this.setGround(3, 1, GroundType.WallBlue);

    this._container = new Container();
    this.app.stage.addChild(this._container);
    this._ground = new Layer(this._container, _width, _height);

    this.updateLayers();
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get z(): number { return this._z; }
  set x(x: number) { this._x = x; }
  set y(y: number) { this._y = y; }
  set z(z: number) { this._z = z; }

  setGround(x: number, y: number, typ: GroundType) {
    this._cells[y * this._width + x].ground = typ;
  }

  cell(x: number, y: number): Cell {
    return this._cells[y * this._width + x];
  }

  addEntity(entity: Entity) {
    if (entity.map) {
      if (entity.map == this) {
        return;
      }
      entity.map.removeEntity(entity);
    }

    entity.setMap(this, this._nextId++);
    this._entities[entity.id] = entity;
    this._container.addChild(entity.sprite);
  }

  removeEntity(entity: Entity) {
    if (entity.map != this) {
      return;
    }

    entity.setMap(null, 0);
    delete this._entities[entity.id];
    this._container.removeChild(entity.sprite);
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
    for (var y = 0; y < this._height; y++) {
      for (var x = 0; x < this._width; x++) {
        this._cells.push({
          ground: GroundType.Empty,
        });
      }
    }
  }

  private updateLayers() {
    for (var y = 0; y < this._height; y++) {
      for (var x = 0; x < this._width; x++) {
        let tile = _groundTiles[this.cell(x, y).ground];
        this._ground.setTile(x, y, tile);
      }
    }
  }
}
