import { Application, Container } from "pixi.js";
import { Entity } from "./entity";

export enum ActionType {
  Move = 1,
}

export interface Action {
  type: ActionType;
  actor: Entity;
  target: Entity;
}

export class Map {
  private _entities: { [id: number]: Entity } = {};
  private _nextId = 1;

  private _container: Container;

  private _x = 0;
  private _y = 0;
  private _z = 4;

  constructor(private app: Application, private _width: number, private _height: number) {
    this._container = new Container();
    this.app.stage.addChild(this._container);
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get z(): number { return this._z; }
  set x(x: number) { this._x = x; }
  set y(y: number) { this._y = y; }
  set z(z: number) { this._z = z; }

  addEntity(entity: Entity, x?: number, y?: number) {
    if (entity.map) {
      if (entity.map == this) {
        return;
      }
      entity.map.removeEntity(entity);
    }

    entity.setMap(this, this._nextId++);
    this._entities[entity.id] = entity;
    this._container.addChild(entity.sprite);
    entity.move(x || 0, y || 0);
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
  }
}
