import { entChunk, EntityId, Var } from "../entity";
import { World } from "../world";
import { builtins } from "./builtins";
import { EAdd, EArgs, ECall, EDef, EExpr, EGet, ELet, ELoc, ENative, ESet, Frame, NativeFn } from "./script";

const ScriptError = 'script error';

export class Actions {
  private _defs: { [name: string]: EDef[] } = {};

  constructor(private _world: World) {
    for (let def of builtins) {
      this.def(def);
    }
  }

  eval(expr: EExpr): any {
    try {
      return this._eval(expr, []);
    } catch (e) {
      return undefined;
    }
  }

  private _eval(expr: EExpr, stack: Frame[]): any {
    try {
      switch (typeof expr) {
        case 'number':
        case 'string':
        case 'boolean':
          return expr;

        case 'object':
          if (expr.constructor == Array) {
            switch (expr[0]) {
              case 'def': return this.def(expr as EDef);
              case 'native': return this.native(expr as ENative, stack);
              case 'let': return this.let(expr as ELet, stack);
              // case 'get': return this.get(expr as EGet, stack);
              // case 'set': return this.set(expr as ESet, stack);
              case '+': return this.add(expr as EAdd, stack);
              default:
                if (expr.length == 1) {
                  return this.loc(expr as ELoc, stack);
                } else if (expr.length == 2 && !isMap(expr[1])) {
                  return this.get(expr as EGet, stack);
                } else if (expr.length == 3 && !isMap(expr[1])) {
                  return this.set(expr as ESet, stack);
                } else {
                  return this.call(expr as ECall, stack);
                }
            }
          }
          return undefined;
      }
    } catch (e) {
      if (e != ScriptError) {
        console.log(printStack(stack), e);
      }
      throw ScriptError;
    }
  }

  private add(a: EAdd, stack: Frame[]): any {
    let a0 = this._eval(a[1], stack);
    let a1 = this._eval(a[2], stack);
    return a0 + a1;
  }

  private let(l: ELet, stack: Frame[]): any {
    let args: EArgs = l[1];
    let body = l.slice(2) as EExpr[]; // Type checker isn't quite *that* smart.

    // Eval all args first.
    let frame: Frame = { name: "let", args: {} };
    for (let name in args) {
      frame.args[name] = this._eval(args[name], stack);
    }

    return this.body(body, frame, stack);
  }

  private loc(l: ELoc, stack: Frame[]): any {
    let name: string = l[0];
    for (let i = stack.length - 1; i >= 0; i--) {
      let frame = stack[i];
      if (name in frame.args) {
        return frame.args[name];
      }
    }
    return undefined;
  }

  private get(g: EGet, stack: Frame[]): any {
    // TODO: check that arg was declared.
    let entId = this._eval(g[0], stack) as EntityId;
    let name = g[1];
    let chunkId = entChunk(entId);
    let chunk = this._world.chunk(chunkId);
    let ent = chunk.entity(entId);
    return ent.getVar(name as Var);
  }

  private set(s: ESet, stack: Frame[]): void {
    let entId = this._eval(s[0], stack) as EntityId;
    let name = s[1];
    let value = this._eval(s[2], stack);
    let chunkId = entChunk(entId);
    let chunk = this._world.chunk(chunkId);
    let ent = chunk.entity(entId);
    ent.setVar(name as Var, value);
  }

  private def(def: EDef): any {
    let name = def[1];
    if (!(name in this._defs)) {
      this._defs[name] = [];
    }
    // TODO: validate def syntax.
    this._defs[name].push(def);
  }

  private native(nat: ENative, stack: Frame[]): any {
    try {
      // Call native impl.
      let fn = nat[1] as NativeFn;
      return fn(this._world, stack[stack.length - 1]);
    } catch (e) {
      if (e != ScriptError) {
        console.log(printStack(stack), e);
      }
      throw ScriptError;
    }
  }

  private call(call: ECall, stack: Frame[]): any {
    let name = call[0];
    let args = call[1];

    // Eval all args eagerly.
    let frame: Frame = { name: name, args: {} };
    for (let name in args) {
      frame.args[name] = this._eval(args[name], stack);
    }

    // Find all matching procedures and execute them.
    let last: any = undefined;
    for (let def of this.matchingDefs(name, frame)) {
      let impl = def.slice(3) as EExpr[];
      last = this.body(impl, frame, stack);
    }

    // TODO: Ew, gross. Language design issue -- what to return when multiple defs match?
    return last;
  }

  private matchingDefs(name: string, frame: Frame): EDef[] {
    let matching: EDef[] = [];
    if (name in this._defs) {
      let defs = this._defs[name];
      outer:
      for (let def of defs) {
        let sig = def[2];
        for (let arg of sig) {
          if (!(arg in frame.args)) {
            // Missing arg; skip this def.
            continue outer;
          }
        }
        matching.push(def);
      }
    }
    return matching;
  }

  private body(body: EExpr[], frame: Frame, stack: Frame[]): any {
    stack.push(frame);
    let last: any;
    for (let expr of body) {
      last = this._eval(expr, stack);
    }
    stack.pop();
    return last;
  }
}

function isMap(o: any) {
  return (typeof o == 'object' && o.constructor == Object);
}

function printStack(stack: Frame[], top?: Frame) {
  let msg = "";
  let print = function (frame: Frame) {
    let name = frame.name;
    if (!name) {
      name = "expr"
    }
    msg += `[${name}] - `
    for (let key in frame.args) {
      msg += `${key}: ${frame.args[key]} `
    }
    msg += "\n";
  }

  if (top) {
    print(top);
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    print(stack[i]);
  }

  return msg;
}
