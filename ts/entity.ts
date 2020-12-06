import { BaseTexture, MIPMAP_MODES, Rectangle, SCALE_MODES, Sprite, Spritesheet, SpritesheetLoader, Texture } from "pixi.js";
import { Map } from "./map";
import { ResourceKey } from "./res";

export type EntityId = number;

export interface EntityDef {
  texRes: ResourceKey;
  sprX?: number;
  sprY?: number;
  sprW?: number;
  sprH?: number;
  ofsX?: number;
  ofsY?: number;
}

export const player: EntityDef = {
  texRes: ResourceKey.Player,
  sprX: 16, sprH: 24,
  ofsY: -12,
};

export const tile: EntityDef = {
  texRes: ResourceKey.Tiles,
  sprX: 16 * 5, sprY: 0,
};

export const wall: EntityDef = {
  texRes: ResourceKey.Tiles,
  sprX: 16 * 4, sprY: 16 * 1,
};

export class Entity {
  private _map: Map;
  private _id = -1;
  private _x = 0;
  private _y = 0;
  private _spr: Sprite;

  constructor(private _def: EntityDef) {
  }

  get map(): Map { return this._map; }
  get id(): number { return this._id; }
  get x(): number { return this._x; }
  get y(): number { return this._y; }

  get sprite(): Sprite {
    if (!this._spr) {
      let btex = BaseTexture.from(this._def.texRes);
      btex.scaleMode = SCALE_MODES.NEAREST;
      btex.mipmap = MIPMAP_MODES.OFF;

      let tex = new Texture(btex, new Rectangle(
        this._def.sprX || 0,
        this._def.sprY || 0,
        this._def.sprW || 16,
        this._def.sprH || 16
      ));
      this._spr = new Sprite(tex);
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
    this._spr.position.x = x * 16 + (this._def.ofsX || 0);
    this._spr.position.y = y * 16 + (this._def.ofsY || 0);
  }
}
