import { Sprite } from "pixi.js";
import { Map } from "./map";
import { ImageKey, Resources } from "./res";

export enum EntityId {
  Unknown = -1,
  System = 0,
}

export enum EntityType {
  Player = "player",
  TileBlue = "tile-blue",
  WallBlue = "wall-blue",
}

interface EntityDef {
  img: ImageKey,
}

const _entityDefs: { [key: string]: EntityDef} = {
  "player": {
    img: ImageKey.Player0,
  },
  "tile-blue": {
    img: ImageKey.TileBlueTile,
  },
  "wall-blue": {
    img: ImageKey.TileBlueWall,
  },
};

export class Entity {
  private _map: Map;
  private _def: EntityDef;
  private _id = EntityId.Unknown;
  private _x = 0;
  private _y = 0;
  private _spr: Sprite;

  constructor(type: EntityType) {
    if (!(type in _entityDefs)) {
      throw "invalid entity type";
    }
    this._def = _entityDefs[type];
  }

  get map(): Map { return this._map; }
  get id(): number { return this._id; }
  get x(): number { return this._x; }
  get y(): number { return this._y; }

  get sprite(): Sprite {
    if (!this._spr) {
      this._spr = Resources.sprite(this._def.img)
    }
    return this._spr;
  }

  setMap(map: Map, id: EntityId) {
    this._map = map;
    this._id = id;
  }

  move(x: number, y: number) {
    this._x = x;
    this._y = y;
    this._spr.position.x = x * 16;
    this._spr.position.y = y * 16;
  }
}
