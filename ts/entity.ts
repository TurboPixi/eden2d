import { MIPMAP_MODES, SCALE_MODES, Sprite, Texture } from "pixi.js";
import { Map } from "./map";
import { ResourceKey } from "./res";

export type EntityId = number;

export interface EntityDef {
  texRes: ResourceKey;
}

export const player: EntityDef = {
  texRes: ResourceKey.Player
}

export class Entity {
  private _map: Map;
  private _id = -1;
  private _x = 0;
  private _y = 0;
  private _spr: Sprite;

  constructor(def: EntityDef) {
    let tex = Texture.from(def.texRes);
    tex.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    tex.baseTexture.mipmap = MIPMAP_MODES.OFF;
    tex.frame.x = 16;
    tex.updateUvs();

    this._spr = new Sprite(tex);
  }

  get map(): Map { return this._map; }
  get id(): number { return this._id; }
  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get sprite(): Sprite { return this._spr; }

  setMap(map: Map, id: number) {
    this._map = map;
    this._id = id;
  }

  move(x: number, y: number) {
    this._x = x;
    this._y = y;
    this._spr.position.x = x * 16;
    this._spr.position.y = y * 16 - 12;
  }
}
