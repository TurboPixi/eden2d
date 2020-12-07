import { Sprite } from "pixi.js";
import { Chunk, ChunkId } from "./chunk";
import { ImageKey, Resources } from "./res";

export enum Var {
  Contents = "contents"
}

export enum EntityId {
  Unknown = -1,
  System = 0,
}

export enum EntityType {
  Player = "player",
  TileBlue = "tile-blue",
  WallBlue = "wall-blue",
  ObjectKey = "object-key",
}

interface EntityDef {
  img: ImageKey,
}

const _entityDefs: { [key: string]: EntityDef } = {
  "player": {
    img: ImageKey.Player0,
  },
  "tile-blue": {
    img: ImageKey.TileBlueTile,
  },
  "wall-blue": {
    img: ImageKey.TileBlueWall,
  },
  "object-key": {
    img: ImageKey.ObjectKey,
  }
};

export class Entity {
  private _def: EntityDef;
  private _id = EntityId.Unknown;

  private _chunk: Chunk;
  private _x = 0;
  private _y = 0;

  // TODO: Lazy init because so many empty ents.
  private _numVals: { [key: string]: number} = {};
  private _strVals: { [key: string]: string} = {};
  private _chunkVals: { [key: string]: ChunkId} = {};

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

  setNum(key: Var, val: number) { this._numVals[key] = val; }
  getNum(key: Var): number { return this._numVals[key]; }
  setStr(key: Var, val: string) { this._strVals[key] = val; }
  getStr(key: Var): string { return this._strVals[key]; }
  setChunk(key: Var, val: ChunkId) { this._chunkVals[key] = val; }
  getChunk(key: Var): ChunkId { return this._chunkVals[key]; }

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
