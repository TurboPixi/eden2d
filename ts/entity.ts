import { Sprite } from "pixi.js";
import { Chunk, ChunkId } from "./chunk";
import { ImageKey, Resources } from "./res";
import { Type } from "./actions";

export enum Var {
  UI = "ui",                    // Bool marking entity as UI element.
  Contents = "contents",        // Chunk representing a container entity's contents.
  Portable = "portable",        // Bool marking an entity as moveable.
  Portal = "portal",            // Bool marking an entity as a portal.
  PortalChunk = "portalchunk",  // A portal's target chunk.
  PortalX = "portalx",          // ... target coordinates.
  PortalY = "portaly",          // ...
}

// This is kind of gross. An entity id is a number, and we need to bury both chunk id and index in a single value.
// In a sane world, we'd do this with a 64-bit value, but this is js, so we're stuck playing float/int tricks to get 52 bits.
// Note that we can't use bit operators for this because they implicitly coerce numeric values to 32 bits, because... js.

export enum EntityId {
  Unknown = -1,
}

const _2_26 = 67108864;
export function makeEntId(chunk: ChunkId, idx: number): EntityId {
  return (chunk * _2_26) + idx as EntityId;
}

export function entChunk(entId: EntityId): ChunkId {
  return Math.floor(entId / _2_26) as ChunkId;
}

export function entIndex(entId: EntityId): number {
  let chunk = entChunk(entId);
  return entId - chunk * _2_26;
}

export enum EntityType {
  Cursor = "cursor",
  Player = "player",
  TileBlue = "tile-blue",
  WallBlue = "wall-blue",
  StairDown = "stair-down",
  StairUp = "stair-up",
  ObjectKey = "object-key",
}

interface EntityDef {
  img: ImageKey;
  vars: { [key: string]: any };
}

const _entityDefs: { [key: string]: EntityDef } = {
  "cursor": {
    img: ImageKey.TileBlueTile,
    vars: {
      "ui-bool": true,
    },
  },
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

function varKey(name: Var, typ: Type): string {
  return name + "-" + typ;
}

export class Entity {
  private _def: EntityDef;
  private _id = EntityId.Unknown;
  private _chunk: Chunk;
  private _x = 0;
  private _y = 0;
  private _vars: { [key: string]: any };
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

  setVar(name: Var, typ: Type, val: any) {
    if (!this._vars) {
      this._vars = {};
    }
    this._vars[varKey(name, typ)] = val;
  }

  getVar(name: Var, typ: Type): any {
    let key = varKey(name, typ);
    if (this._vars && (key in this._vars)) {
      return this._vars[key];
    }
    return this._def.vars[key];
  }

  setChunkAndId(chunk: Chunk, id: EntityId) {
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
