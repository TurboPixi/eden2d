import { BaseTexture, MIPMAP_MODES, Rectangle, SCALE_MODES, Sprite, Spritesheet, SpritesheetLoader, Texture } from "pixi.js";
import { Map } from "./map";
import { ImageKey, Resources } from "./res";

export type EntityId = number;

export interface EntityDef {
  img: ImageKey;
  sprX?: number;
  sprY?: number;
  sprW?: number;
  sprH?: number;
  ofsX?: number;
  ofsY?: number;
}

export class Entity {
  private _map: Map;
  private _id = -1;
  private _x = 0;
  private _y = 0;
  private _spr: Sprite;

  constructor(private _img: ImageKey) {
  }

  get map(): Map { return this._map; }
  get id(): number { return this._id; }
  get x(): number { return this._x; }
  get y(): number { return this._y; }

  get sprite(): Sprite {
    if (!this._spr) {
      this._spr = Resources.sprite(this._img)
    }
    return this._spr;
  }

  setMap(map: Map, id: number) {
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
