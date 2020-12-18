import { entChunk, EntityId, Var } from "../entity";
import { World } from "../world";
import { EArgs, ECall, ECallable, EDef, EExpr, EGet, EInvokable, EInvoke, ELet, EParams, ESet, ESym, Frame, NativeFunc } from "./script";

const ScriptError = 'script error';

export interface Context {
  self(): any;
  scope(): Scope;
  parent(): Context;
}

export class Scope {
  private _defs: { [name: string]: EExpr } = {};

  constructor(private _world: World) {
  }

  eval(ctx: Context, expr: EExpr): any {
    try {
      return this._eval(ctx, expr, []);
    } catch (e) {
      return undefined;
    }
  }

  private _eval(ctx: Context, expr: EExpr, stack: Frame[]): any {
    try {
      switch (typeof expr) {
        case 'number':
        case 'boolean':
          return expr;

        case 'string':
          // Raw strings are treated as symbol references, as they're far more common than literal strings.
          return this.sym(ctx, expr, stack);

        case 'object':
          if ((expr.constructor == Array) && (expr.length > 0)) {
            switch (expr[0]) {
              case 'def': return this.def(ctx, expr as EDef);
              case 'let': return this.let(ctx, expr as ELet, stack);
              case 'get': return this.get(ctx, expr as EGet, stack);
              case 'set': return this.set(ctx, expr as ESet, stack);

              case 'func':
              case 'action':
              case 'native': {
                // TODO: Validate structure.
                return expr;
              }

              default:
                if (expr.length == 1) {
                  // Literal strings have the form ["whatevs"].
                  return expr[0];
                } else if (isMap(expr[1])) {
                  // Event call has form [name, { arg: value, ...}].
                  return this.call(ctx, expr as ECall, stack);
                } else {
                  // Func invoke has form [name, value*].
                  if (expr.length == 2 && expr[1] == []) {
                    // Special case -- ['fn', []] is a no-arg function invocation.
                    expr.length = 1;
                  }
                  return this.invoke(ctx, expr as EInvoke, stack);
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

  private let(ctx: Context, l: ELet, stack: Frame[]): any {
    let args: EArgs = l[1];
    let body = l.slice(2) as EExpr[]; // Type checker isn't quite *that* smart.

    // Eval all args first.
    let frame: Frame = { name: "let", args: {} };
    for (let name in args) {
      frame.args[name] = this._eval(ctx, args[name], stack);
    }

    return this.body(ctx, body, frame, stack);
  }

  private sym(ctx: Context, name: ESym, stack: Frame[]): any {
    for (let i = stack.length - 1; i >= 0; i--) {
      let frame = stack[i];
      if (name in frame.args) {
        return frame.args[name];
      }
    }

    // TODO: Something with context/parent scopes. At present, we only lookup names in the current scope.
    while (ctx) {
      let def = ctx.scope()._defs[name];
      if (def) {
        return def;
      }
      ctx = ctx.parent();
    }
    return undefined;
  }

  private get(ctx: Context, g: EGet, stack: Frame[]): any {
    // TODO: check that arg was declared.
    let entId = this._eval(ctx, g[1], stack) as EntityId;
    let name = g[2];
    let chunkId = entChunk(entId);
    let chunk = this._world.chunk(chunkId);
    let ent = chunk.entity(entId);
    return ent.getVar(name as Var);
  }

  private set(ctx: Context, s: ESet, stack: Frame[]): void {
    let entId = this._eval(ctx, s[1], stack) as EntityId;
    let name = s[2];
    let value = this._eval(ctx, s[3], stack);
    let chunkId = entChunk(entId);
    let chunk = this._world.chunk(chunkId);
    let ent = chunk.entity(entId);
    ent.setVar(name as Var, value);
  }

  private def(ctx: Context, def: EDef): any {
    let name = def[1];
    if (name in this._defs) {
      throw "illegal redefinition of " + name;
    }
    this._defs[name] = def[2];
  }

  private invoke(ctx: Context, invoke: EInvoke, stack: Frame[]): any {
    let func: EInvokable = this._eval(ctx, invoke[0], stack); // TODO: Validate func-ness.
    if (!func) {
      // TODO: Validate action-ness.
      throw "unable to invoke " + func;
    }
    let args = invoke.slice(1)

    let native = func[0] == 'native';
    let params = (native ? func[2] : func[1]) as EParams;

    // Eval all args eagerly.
    // TODO: validate args.
    let frame: Frame = { name: "[todo]", args: {} };
    for (let i = 0; i < args.length; i++) {
      frame.args[params[i]] = this._eval(ctx, args[i], stack);
    }

    if (native) {
      let fn = func[3] as NativeFunc;
      return this.native(ctx, fn, frame, stack);
    }

    let body = func.slice(2) as EExpr[];
    return this.body(ctx, body, frame, stack);
  }

  private call(ctx: Context, call: ECall, stack: Frame[]): void {
    let action = this._eval(ctx, call[0], stack);
    if (!action) {
      // TODO: Validate action-ness.
      throw "unable to call " + action;
    }
    let args = call[1];

    let native = action[0] == 'native';
    let params = (native ? action[2] : action[1]) as EParams;

    // Eval all args eagerly.
    // TODO: validate args.
    let frame: Frame = { name: "[todo]", args: {} };
    for (let name in args) {
      frame.args[name] = this._eval(ctx, args[name], stack);
    }

    // TODO: Find all matching actions.
    if (native) {
      let fn = action[3] as NativeFunc;
      this.native(ctx, fn, frame, stack);
    } else {
      let body = action.slice(2) as EExpr[];
      this.body(ctx, body, frame, stack);
    }
  }

  private body(ctx: Context, body: EExpr[], frame: Frame, stack: Frame[]): any {
    stack.push(frame);
    let last: any;
    for (let expr of body) {
      last = this._eval(ctx, expr, stack);
    }
    stack.pop();
    return last;
  }

  private native(ctx: Context, fn: NativeFunc, frame: Frame, stack: Frame[]): any {
    try {
      // Call native impl.
      return fn(this._world, frame);
    } catch (e) {
      if (e != ScriptError) {
        console.log(printStack(stack), e);
      }
      throw ScriptError;
    }
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
