import { entChunk, Entity, EntityId, EntityType, Var } from "./entity";
import { Chunk, ChunkId } from "./chunk";
import { World } from "./world";

// TODO: Consider matching return type on func defs to further disambiguate.
export type Expr = Primitive | Call | Definition | Let | Get;
export type Type = "any" | "str" | "num" | "bool" | "ent" | "chunk" | "tent" | "type";
type Primitive = string | number | boolean;
type Call = [string, Args];
type Args = { [arg: string]: Expr };
type Definition = ['def', string, Params, Impl];
type Params = { [arg: string]: string[] | Type };
type Let = ['let', Args, Expr[]];
type Get = ['get', string]
type Impl = Native | Expr[];
type Native = ["native", string];

type Frame = { [name: string]: Primitive };

// Keywords.
export const Def = "def";
export const Let = "let";
export const Get = "get";
export const Native = "native";
export const SetVar = "setvar";
export const GetVar = "getvar";

// Types.
export const TAny: Type = "any";
export const TStr: Type = "str";
export const TNum: Type = "num";
export const TBool: Type = "bool";
export const TChunk: Type = "chunk";
export const TEnt: Type = "ent";
export const TType: Type = "type";
export const TEntType: Type = "tent";

// Builtins.
export const New = "new";
export const Move = "move";
export const Jump = "jump";

var _nativeDefs: Definition[] = [
  [Def, SetVar, { ent: TEnt, name: TStr, type: TType, value: TAny }, [Native, SetVar]],
  [Def, GetVar, { ent: TEnt, name: TStr, type: TType }, [Native, GetVar]],
  [Def, New, { chunk: TChunk, type: TEntType, x: TNum, y: TNum }, [Native, New]],
  [Def, Move, { ent: TEnt, dx: TNum, dy: TNum }, [Native, Move]],
  [Def, Jump, { ent: TEnt, chunk: TChunk, x: TNum, y: TNum }, [Native, Jump]],
];

export class Actions {
  private _defs: { [name: string]: Definition[] } = {};

  constructor(private _world: World) {
    for (let def of _nativeDefs) {
      this.def(def);
    }

    this.builtins();
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
            case Def: return this.def(expr as Definition);
            case Let: return this.let(expr as Let, stack);
            case Get: return this.get(expr as Get, stack);
            default: return this.call(expr as Call, stack);
          }
        }
        return undefined;
    }
  }

  private let(l: Let, stack: Frame[]): any {
    let args: Args = l[1];
    let body: Expr[] = l[2];

    // Eval all args first.
    let frame: Frame = {};
    for (let name in args) {
      frame[name] = this.eval(args[name], stack);
    }

    for (let expr of body) {
      this.eval(expr, stack.concat(frame));
    }
  }

  private get(g: Get, stack: Frame[]): any {
    let name: string = g[1];
    for (let parent of stack) {
      if (name in parent) {
        return parent[name];
      }
    }
    return undefined;
  }

  private def(def: Definition): any {
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

    // Eval all args eagerly.
    let frame: Frame = {};
    for (let name in args) {
      frame[name] = this.eval(args[name], stack);
    }

    // Find all matching procedures and execute them.
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
        case SetVar: {
          let ent = frame['ent'] as EntityId;
          let name = frame['name'] as string;
          let type = frame['type'] as Type;
          let value = frame['value'] as any;
          this.setVar(ent, name, type, value);
          break;
        }

        case GetVar: {
          let ent = frame['ent'] as EntityId;
          let name = frame['name'] as string;
          let type = frame['type'] as Type;
          return this.getVar(ent, name, type);
        }

        case New: {
          let chunk = frame['chunk'] as number;
          let type = frame['type'] as EntityType;
          let x = frame['x'] as number;
          let y = frame['y'] as number;
          return this.create(chunk, type, x, y);
        }

        case Move: {
          let ent = frame['ent'] as EntityId;
          let dx = frame['dx'] as number;
          let dy = frame['dy'] as number;
          return this.move(ent, dx, dy);
        }

        case Jump: {
          let ent = frame['ent'] as EntityId;
          let chunk = frame['chunk'] as ChunkId;
          let x = frame['x'] as number;
          let y = frame['y'] as number;
          return this.transfer(ent, chunk, x, y);
        }

        default:
          throw "missing native " + name;
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

  private setVar(entId: EntityId, name: string, type: Type, value: any): void {
    let chunkId = entChunk(entId);
    let chunk = this._world.chunk(chunkId);
    let ent = chunk.entity(entId);
    ent.setVar(name as Var, type, value);
  }

  private getVar(entId: EntityId, name: string, type: Type): any {
    let chunkId = entChunk(entId);
    let chunk = this._world.chunk(chunkId);
    let ent = chunk.entity(entId);
    return ent.getVar(name as Var, type);
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

  private builtins() {
    this.eval([Def, "portal", { type: TEntType, from: TChunk, fx: TNum, fy: TNum, to: TChunk, tx: TNum, ty: TNum }, [
      [Let, { ent: [New, { chunk: [Get, 'from'], type: [Get, 'type'], x: [Get, 'fx'], y: [Get, 'fy'] }] }, [
        [SetVar, { ent: [Get, 'ent'], name: Var.PortalChunk, type: TChunk, value: [Get, 'to'] }],
        [SetVar, { ent: [Get, 'ent'], name: Var.PortalX, type: TNum, value: [Get, 'tx'] }],
        [SetVar, { ent: [Get, 'ent'], name: Var.PortalY, type: TNum, value: [Get, 'ty'] }],
      ]]]]);
  }
}

export function topWithVar(chunk: Chunk, boolVar: Var, x: number, y: number): Entity {
  let ents = chunk.entitiesAt(x, y);
  for (var ent of ents) {
    if (ent.getVar(boolVar, TBool)) {
      return ent;
    }
  }
  return null;
}
