import { Sprite } from "pixi.js";
import { Chunk, locChunk } from "./chunk";
import { ImageKey, Resources } from "./res";
import { evaluate } from "./script/eval";
import { parse } from "./script/kurt";
import { IScope, isScope, locScope, locNum, Scope, scopeDef, scopeParent, scopeRef, _root, scopeEval } from "./script/scope";
import { $, $$, chuck, EDict, EExpr, ESym, isDict, nil, symName, _, _blk, _def, _parent, _set } from "./script/script";

export const VarX = "x";
export const VarY = "y";
export const VarChunk = "chunk";
export const VarUI = "ui";                    // Bool marking entity as UI element.
export const VarPortable = "portable";        // Bool marking an entity as moveable.
export const VarContents = "contents";        // Chunk representing a container entity's contents.
export const VarPortal = "portal";            // Bool marking an entity as a portal.
export const VarPortalChunk = "portalchunk";  // A portal's target chunk.
export const VarPortalX = "portalx";          // ... target coordinates.
export const VarPortalY = "portaly";          // ...

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

export interface Prototype {
  img: ImageKey;
  vars: EDict;
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

export let EntityClass = [_def, $$('Entity'), {
  'move-to': [$('x'), $('y'), _blk, (scope: Scope) => {
    let self = locScope(scope, $('@'));
    let x = locNum(scope, $('x'));
    let y = locNum(scope, $('y'));
    isEntity(self).move(x, y);
    return self;
  }],

  jump: [$('chunk'), _blk,
    function (scope: Scope): EExpr {
      let self = locEnt(scope, $('@'));
      let to = locChunk(scope, $('chunk'));
      to.addEntity(self);
      return self;
    }
  ],

  'top-with': parse(`[var |
    [[@:chunk]:top-with] [@:x] [@:y] var
  ]`),
}];

export class Entity implements IScope {
  private _proto: Prototype;
  private _chunk: Chunk;
  private _id: number;
  private _x = 0;
  private _y = 0;
  private _defs: { [name: string]: EExpr };
  private _spr: Sprite;

  constructor(scope: Scope, type: EntityType) {
    if (!(type in _protos)) {
      throw "invalid entity type";
    }
    this._proto = _protos[type];
    this.def($('comps'), {});
    evaluate(scope, [_set, this, _(_parent), $('Entity')]);
  }

  get id(): number { return this._id }
  get chunk(): Chunk { return this._chunk }
  get x(): number { return this._x }
  get y(): number { return this._y }

  get sprite(): Sprite {
    if (!this._spr) {
      this._spr = Resources.sprite(this._proto.img)
    }
    return this._spr;
  }

  get names(): string[] {
    let keys = this._defs ? Object.keys(this._defs) : [];
    return [...keys, VarX, VarY, VarChunk];
  }

  def(sym: ESym, value: EExpr): void {
    switch (symName(sym)) {
      case VarX:
      case VarY:
      case VarChunk:
        // Read-only.
        throw `read-only ${symName(sym)}`;
    }

    if (!this._defs) {
      this._defs = {};
    }
    scopeDef(this._defs, sym, value);
  }

  ref(sym: ESym): EExpr {
    switch (symName(sym)) {
      case VarX: return this._x;
      case VarY: return this._y;
      case VarChunk: return this._chunk;
    }

    let name = symName(sym);
    if (this._defs && name in this._defs) {
      return this._defs[name];
    }
    return this._proto.vars[name];
  }

  setChunkAndId(chunk: Chunk, id: number) {
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

export function isEntity(expr: EExpr): Entity {
  let scope = isScope(expr);
  while (scope) {
    if (scope instanceof Entity) {
      return expr as Entity;
    }
    scope = scopeParent(scope);
  }
  return undefined;
}

export function locEnt(scope: Scope, sym: ESym): Entity {
  let ent = isEntity(scopeEval(scope, sym));
  if (ent === undefined) {
    chuck(scope, `${name}: ${scopeRef(scope, sym)} is not an entity`);
  }
  return ent as Entity;
}
