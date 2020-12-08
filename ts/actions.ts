import { Entity, EntityId, EntityType, Var } from "./entity";
import { Chunk, ChunkId } from "./chunk";
import { World } from "./world";

export type Prim = string | number | boolean;
export type Call = [string, { [arg: string]: Prim | Expr }]
export type Def = ['def', string,
  { [arg: string]: { [constraint: string]: any } | string },
  "native" | Expr[]
];
export type Expr = Prim | Call | Def

export const Define = "def";
export const Native = "native";

export enum Natives {
  Create = "create",
  Move = "move",
  Transfer = "transfer",
}

var defMove: Def = [
  Define, Natives.Move, {
    chunk: 'Chunk',
    ent: { type: 'Entity' },
    x: 'Num',
    y: 'Num',
  },
  Native
];

export class Actions {
  constructor(private _world: World) {
    this.define(defMove);
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
    // TODO
  }

  private call(call: Call): any {
    let name = call[0];
    let args = call[1];
    switch (name) {
      case Natives.Create: {
        let chunk = this.eval(args['chunk']);
        let type = this.eval(args['type']);
        let x = this.eval(args['x']);
        let y = this.eval(args['y']);
        return this.create(chunk, type, x, y);
      }

      case Natives.Move: {
        let chunk = this.eval(args['chunk']);
        let ent = this.eval(args['ent']);
        let dx = this.eval(args['dx']);
        let dy = this.eval(args['dy']);
        return this.move(chunk, ent, dx, dy);
      }

      case Natives.Transfer: {
        let from = this.eval(args['from']);
        let ent = this.eval(args['ent']);
        let to = this.eval(args['to']);
        let x = this.eval(args['x']);
        let y = this.eval(args['y']);
        return this.transfer(from, ent, to, x, y);
      }
    }
    return undefined;
  }

  private create(chunkId: ChunkId, entType: EntityType, x: number, y: number): EntityId {
    let chunk = this._world.chunk(chunkId);
    let ent = new Entity(entType);
    chunk.addEntity(ent, x, y);
    return ent.id;
  }

  private move(chunkId: ChunkId, entId: EntityId, dx: number, dy: number): void {
    let chunk = this._world.chunk(chunkId);
    let ent = chunk.entity(entId);
    ent.move(ent.x + dx, ent.y + dy);
  }

  private transfer(fromId: ChunkId, entId: EntityId, toId: ChunkId, x: number, y: number): void {
    let from = this._world.chunk(fromId);
    let ent = from.entity(entId);
    let to = this._world.chunk(toId);
    to.addEntity(ent, x, y);
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
