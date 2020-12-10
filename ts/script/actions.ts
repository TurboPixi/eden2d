import { World } from "../world";
import { builtins } from "./builtins";
import { Args, Call, Def, Definition, Expr, Frame, Get, Impl, Let, Native } from "./script";

export class Actions {
  private _defs: { [name: string]: Definition[] } = {};

  constructor(private _world: World) {
    for (let def of builtins) {
      this.def(def);
    }
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
    switch (impl[0]) {
      case Native: {
        // Call native impl.
        let native = impl as Native;
        let fn = native[1] as (world: World, frame: Frame) => any;
        return fn(this._world, frame);
      }

      default: {
        // Evaluate body.
        let body = impl as Expr[];
        let last: any;
        for (let expr of body) {
          last = this.eval(expr, stack.concat(frame));
        }
        return last;
      }
    }
  }
}
