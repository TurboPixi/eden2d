import { Sprite } from "pixi.js";
import { Chunk, ChunkId } from "./chunk";
import { ImageKey, Resources } from "./res";

export enum Var {
  Contents = "contents",
  Portable = "portable",
  Portal = "portal",
  PortalChunk = "portalchunk",
  PortalX = "portalx",
  PortalY = "portaly",
}

enum Type {
  Bool = "bool",
  Num = "num",
  Str = "str",
  Chunk = "chunk",
}

export enum EntityId {
  Unknown = -1,
  System = 0,
}

export enum EntityType {
  Player = "player",
  TileBlue = "tile-blue",
  WallBlue = "wall-blue",
  StairDown = "stair-down",
  StairUp = "stair-up",
  ObjectKey = "object-key",
}

interface EntityDef {
  img: ImageKey;
  vars: { [key: string]: any};
}

const _entityDefs: { [key: string]: EntityDef } = {
  "player": {
    img: ImageKey.Player0,
    vars: {},
  },
  "tile-blue": {
    img: ImageKey.TileBlueTile,
    vars: {},
  },
  "wall-blue": {
    img: ImageKey.TileBlueWall,
    vars: {},
  },
  "object-key": {
    img: ImageKey.ObjectKey,
    vars: {
      "portable-bool": true,
    },
  },
  "stair-down": {
    img: ImageKey.TileStairDown,
    vars: {
      "portal-bool": true,
    },
  },
  "stair-up": {
    img: ImageKey.TileStairUp,
    vars: {
      "portal-bool": true,
    },
  },
};

function varKey(key: Var, typ: Type): string {
  return key + "-" + typ;
}

export class Entity {
  private _def: EntityDef;
  private _id = EntityId.Unknown;
  private _chunk: Chunk;
  private _x = 0;
  private _y = 0;
  private _vars: { [key: string]: any};
  private _spr: Sprite;

  constructor(type: EntityType) {
    if (!(type in _entityDefs)) {
      throw "invalid entity type";
    }
    this._def = _entityDefs[type];
  }

  get chunk(): Chunk { return this._chunk; }
  get id(): number { return this._id; }
  get x(): number { return this._x; }
  get y(): number { return this._y; }

  get sprite(): Sprite {
    if (!this._spr) {
      this._spr = Resources.sprite(this._def.img)
    }
    return this._spr;
  }

  getBool(key: Var): boolean { return this.getVar(key, Type.Bool) as boolean }
  getNum(key: Var): number { return this.getVar(key, Type.Num) as number }
  getStr(key: Var): string { return this.getVar(key, Type.Str) as string }
  getChunk(key: Var): ChunkId { return this.getVar(key, Type.Chunk) as ChunkId }

  setBool(key: Var, val: boolean) { this.setVar(key, Type.Bool, val) }
  setNum(key: Var, val: number) { this.setVar(key, Type.Num, val) }
  setStr(key: Var, val: string) { this.setVar(key, Type.Str, val) }
  setChunk(key: Var, val: ChunkId) { this.setVar(key, Type.Chunk, val) }

  private setVar(key: Var, typ: Type, val: any) {
    if (!this._vars) {
      this._vars = {};
    }
    this._vars[varKey(key, typ)] = val;
  }

  private getVar(key: Var, typ: Type): any {
    let fullKey = varKey(key, typ);
    if (this._vars && (fullKey in this._vars)) {
      return this._vars[fullKey];
    }
    return this._def.vars[fullKey];
  }

  setChunkId(chunk: Chunk, id: EntityId) {
    this._chunk = chunk;
    this._id = id;
  }

  move(x: number, y: number) {
    this._x = x;
    this._y = y;
    this._spr.position.x = x * 16;
    this._spr.position.y = y * 16;
  }
}
