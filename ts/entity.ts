import { MIPMAP_MODES, SCALE_MODES, Sprite, Texture } from "pixi.js";
import { Map } from "./map";
import { ResourceKey } from "./res";

export enum EntityType {
  Player = 1,
}

export type EntityId = number;

export class Entity {
  _map: Map;
  _id = -1;
  _spr: Sprite;

  private _x = -1;
  private _y = -1;

  constructor(private _typ: EntityType) {
    let tex = Texture.from(ResourceKey.Player);
    tex.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    tex.baseTexture.mipmap = MIPMAP_MODES.OFF;
    tex.frame.x = 16;
    tex.updateUvs();

    this._spr = new Sprite(tex);
  }

  move(x: number, y: number) {
    this._x = x;
    this._y = y;
    this._spr.position.x = x * 16;
    this._spr.position.y = y * 16;
  }
}
