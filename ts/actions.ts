import { entChunk, Entity, EntityId, EntityType, Var } from "./entity";
import { Chunk, ChunkId } from "./chunk";
import { World } from "./world";

// TODO: Consider matching return type on func defs to further disambiguate.
export type Expr = Primitive | Call | Definition;
type Primitive = string | number | boolean;
type Type = "str" | "num" | "bool" | "ent" | "chunk" | "type";
type Call = [string, Args];
type Args = { [arg: string]: Expr };
type Definition = ['def', string, Params, Impl];
type Params = { [arg: string]: string[] | Type };
type Impl = Native | Expr[];
type Native = ["native", string];

type Frame = {[name: string]: Primitive};

export const Def = "def";
export const Native = "native";
export const TStr = "str";
export const TNum = "num";
export const TBool = "bool";
export const TChunk = "chunk";
export const TEnt = "ent";
export const TType = "type";

export enum Natives {
  Local = "local",
  Create = "create",
  Move = "move",
  Transfer = "transfer",
}

var _nativeDefs: Definition[] = [
  [Def, Natives.Local, { name: TStr }, [Native, Natives.Local]],
  [Def, Natives.Create, { chunk: TChunk, type: TType, x: TNum, y: TNum }, [Native, Natives.Create]],
  [Def, Natives.Move, { ent: TEnt, dx: TNum, dy: TNum }, [Native, Natives.Move]],
  [Def, Natives.Transfer, { ent: TEnt, chunk: TChunk, x: TNum, y: TNum }, [Native, Natives.Transfer]],
];

export class Actions {
  private _defs: { [name: string]: Definition[] } = {};

  constructor(private _world: World) {
    for (let def of _nativeDefs) {
      this.define(def);
    }

    // Test def.
    this.eval([Def, "testes", { chunk: TChunk }, [
      [Natives.Create, {
        chunk: [Natives.Local, { name: 'chunk' }],
        type: EntityType.ObjectKey,
        x: 2, y: 2,
      }]
    ]]);
  }

  eval(expr: Expr, stack: Frame[] = []): any {
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
            case 'def':
              return this.define(expr as Definition);
            default:
              return this.call(expr as Call, stack);
          }
        }
        return undefined;
    }
  }

  private define(def: Definition): any {
    let name = def[1];
    if (!(name in this._defs)) {
      this._defs[name] = [];
    }
    // TODO: validate def syntax.
    this._defs[name].push(def);
  }

  private call(call: Call, stack: Frame[]): any {
    let name = call[0];
    let args = call[1];

    // Eval all args first.
    let frame: Frame = {};
    for (let name in args) {
      frame[name] = this.eval(args[name], stack);
    }

    let last: any = undefined;
    if (name in this._defs) {
      let defs = this._defs[name];
      outer:
      for (let def of defs) {
        let sig = def[2];
        for (let arg in sig) {
          if (!(arg in frame)) {
            // Missing arg; skip this def.
            continue outer;
          }
          // TODO: validate type
        }
        let impl = def[3];
        last = this.exec(impl, frame, stack);
      }
    }

    // TODO: Ew, gross. Language design issue -- what to return when multiple defs match?
    return last;
  }

  private exec(impl: Impl, frame: Frame, stack: Frame[]): any {
    if (impl[0] == Native) {
      let name = impl[1];
      switch (name) {
        case Natives.Create: {
          let chunk = frame['chunk'] as number;
          let type = frame['type'] as EntityType;
          let x = frame['x'] as number;
          let y = frame['y'] as number;
          return this.create(chunk, type, x, y);
        }

        case Natives.Move: {
          let ent = frame['ent'] as EntityId;
          let dx = frame['dx'] as number;
          let dy = frame['dy'] as number;
          return this.move(ent, dx, dy);
        }

        case Natives.Transfer: {
          let ent = frame['ent'] as EntityId;
          let chunk = frame['chunk'] as ChunkId;
          let x = frame['x'] as number;
          let y = frame['y'] as number;
          return this.transfer(ent, chunk, x, y);
        }

        case Natives.Local: {
          // TODO: Actual locals on the stack.
          let name = frame['name'] as string;
          for (let parent of stack) {
            if (name in parent) {
              return parent[name];
            }
          }
          return undefined;
        }

        default:
          // TODO: log this error.
          break;
      }
      return undefined;
    }

    // Evaluate body.
    for (let expr of impl) {
      this.eval(expr, stack.concat(frame));
    }
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
