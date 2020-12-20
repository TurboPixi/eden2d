import { Sprite } from "pixi.js";
import { Chunk, ChunkId } from "./chunk";
import { ImageKey, Resources } from "./res";
import { EExpr, EVal, Scope } from "./script/script";
import { World } from "./world";

export enum Var {
  X = "x",
  Y = "y",
  Chunk = "chunk",
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
  ObjectCrate = "object-crate",
}

interface Prototype {
  img: ImageKey;
  vars: { [key: string]: EVal };
}

const _protos: { [key: string]: Prototype } = {
  "cursor": { img: ImageKey.TileBlueTile, vars: { ui: true } },
  "player": { img: ImageKey.Player0, vars: {} },
  "tile-blue": { img: ImageKey.TileBlueTile, vars: {} },
  "wall-blue": { img: ImageKey.TileBlueWall, vars: {} },
  "stair-down": { img: ImageKey.TileStairDown, vars: { portal: true } },
  "stair-up": { img: ImageKey.TileStairUp, vars: { portal: true } },
  "object-key": { img: ImageKey.ObjectKey, vars: { portable: true } },
  "object-crate": { img: ImageKey.ObjectCrate, vars: { portable: true } },
};

export class Entity implements Scope {
  private _proto: Prototype;
  private _id = EntityId.Unknown;
  private _chunk: Chunk;
  private _x = 0;
  private _y = 0;
  private _defs: { [name: string]: EVal };
  private _spr: Sprite;

  constructor(public world: World, type: EntityType) {
    if (!(type in _protos)) {
      throw "invalid entity type";
    }
    this._proto = _protos[type];
  }

  get chunk(): Chunk { return this._chunk; }
  get id(): number { return this._id; }
  get x(): number { return this._x; }
  get y(): number { return this._y; }

  get sprite(): Sprite {
    if (!this._spr) {
      this._spr = Resources.sprite(this._proto.img)
    }
    return this._spr;
  }

  get name(): string { return "[ent]" }
  get parent(): Scope { return this._chunk }

  get names(): string[] {
    let keys = this._defs ? Object.keys(this._defs) : [];
    return [...keys, Var.X, Var.Y, Var.Chunk];
  }

  def(name: string, value: EVal): void {
    switch (name) {
      case Var.X:
      case Var.Y:
      case Var.Chunk:
        // Read-only.
        throw `read-only ${this._id}.${name}`;
    }

    if (!this._defs) {
      this._defs = {};
    }
    this._defs[name] = value;
  }

  ref(name: string): EVal {
    switch (name) {
      case Var.X: return this._x;
      case Var.Y: return this._y;
      case Var.Chunk: return this._chunk.id;
    }

    if (this._defs && name in this._defs) {
      return this._defs[name];
    }
    return this._proto.vars[name];
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
