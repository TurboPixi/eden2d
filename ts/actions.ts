import { entChunk, Entity, EntityId, EntityType, Var } from "./entity";
import { Chunk, ChunkId } from "./chunk";
import { World } from "./world";

export type Prim = string | number | boolean;
export type Type = "str" | "num" | "bool" | "ent" | "chunk" | "type";
export type Call = [string, Args];
export type Args = { [arg: string]: Expr };
export type Def = ['def', string, Sig, Impl];
export type Sig = { [arg: string]: string[] | Type };
export type Impl = ["native", string] | Expr[];
export type Expr = Prim | Call | Def;

export const Define = "def";
export const Native = "native";

export enum Natives {
  Create = "create",
  Move = "move",
  Transfer = "transfer",
}

var _nativeDefs: Def[] = [
  [ Define, Natives.Create, { type: 'type', x: 'num', y: 'num' }, [Native, Natives.Create] ],
  [ Define, Natives.Move, { ent: 'ent', dx: 'num', dy: 'num' }, [Native, Natives.Move] ],
  [ Define, Natives.Transfer, { ent: 'ent', chunk: 'chunk', x: 'num', y: 'num' }, [Native, Natives.Transfer] ],
];

export class Actions {
  private _defs: { [name: string]: Def[] } = {};

  constructor(private _world: World) {
    for (let def of _nativeDefs) {
      this.define(def);
    }
  }

  eval(expr: Expr): any {
    switch (typeof expr) {
      case 'number':
      case 'string':
      case 'boolean':
        return expr;

      case 'object':
        if (expr.constructor == Array) {
          if (typeof expr[0] != "string") {
            return undefined;
          }
          switch (expr[0]) {
            case 'def': return this.define(expr as Def);
            default: return this.call(expr as Call);
          }
        }
        return undefined;
    }
  }

  private define(def: Def): any {
    let name = def[1];
    if (!(name in this._defs)) {
      this._defs[name] = [];
    }
    // TODO: validate def syntax.
    this._defs[name].push(def);
  }

  private call(call: Call): any {
    let name = call[0];
    let args = call[1];

    let defs = this._defs[name];
    let last: any = undefined;
    outer:
    for (let def of defs) {
      let sig = def[2];
      for (let arg in sig) {
        if (!(arg in args)) {
          // Missing arg; skip this def.
          continue outer;
        }
        // TODO: validate type
      }
      let impl = def[3];
      last = this.exec(impl, args);
    }

    // TODO: Ew, gross. Language design issue -- what to return when multiple defs match?
    return last;
  }

  private exec(impl: Impl, args: Args): any {
    if (impl[0] == Native) {
      let name = impl[1];
      switch (name) {
        case Natives.Create: {
          let chunk = this.eval(args['chunk']);
          let type = this.eval(args['type']);
          let x = this.eval(args['x']);
          let y = this.eval(args['y']);
          return this.create(chunk, type, x, y);
        }

        case Natives.Move: {
          let ent = this.eval(args['ent']);
          let dx = this.eval(args['dx']);
          let dy = this.eval(args['dy']);
          return this.move(ent, dx, dy);
        }

        case Natives.Transfer: {
          let ent = this.eval(args['ent']);
          let chunk = this.eval(args['chunk']);
          let x = this.eval(args['x']);
          let y = this.eval(args['y']);
          return this.transfer(ent, chunk, x, y);
        }

        default:
          // TODO: log.
          break;
      }
      return undefined;
    }

    // TODO: expressions.
    return undefined;
  }

  private create(chunkId: ChunkId, entType: EntityType, x: number, y: number): EntityId {
    let chunk = this._world.chunk(chunkId);
    let ent = new Entity(entType);
    return chunk.addEntity(ent, x, y);
  }

  private move(entId: EntityId, dx: number, dy: number): void {
    let chunkId = entChunk(entId);
    let chunk = this._world.chunk(chunkId);
    let ent = chunk.entity(entId);
    ent.move(ent.x + dx, ent.y + dy);
  }

  private transfer(entId: EntityId, toId: ChunkId, x: number, y: number): EntityId {
    let fromId = entChunk(entId);
    let from = this._world.chunk(fromId);
    let ent = from.entity(entId);
    let to = this._world.chunk(toId);
    return to.addEntity(ent, x, y);
  }
}

export function portal(world: World, type: EntityType, fromId: ChunkId, fx: number, fy: number, toId: ChunkId, tx: number, ty: number) {
  let from = world.chunk(fromId);
  let entId = world.eval([Natives.Create, {
    chunk: fromId,
    type: type,
    x: fx, y: fy
  }]);

  let ent = from.entity(entId);
  ent.setChunk(Var.PortalChunk, toId);
  ent.setNum(Var.PortalX, tx);
  ent.setNum(Var.PortalY, ty);
}

export function topWithVar(chunk: Chunk, boolVar: Var, x: number, y: number): Entity {
  let ents = chunk.entitiesAt(x, y);
  for (var ent of ents) {
    if (ent.getBool(boolVar)) {
      return ent;
    }
  }
  return null;
}
