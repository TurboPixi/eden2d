import { Chunk } from "../chunk";
import { Entity } from "../entity";
import { World } from "../world";

// Expressions.
export type EExpr = EVal | EInvoke | ECall | EDef | ELet | ERef | ESet | EGet;
export type EVal = number | boolean | string | Chunk | Entity | ECallable | EInvokable | ENull;
export type ENull = [];
export type ERef = [string];                      // TODO: name as expr?
export type EGet = ['get', EExpr, string];        // TODO: name as expr?
export type ESet = ['set', EExpr, string, EExpr]; // TODO: Merge into ref without call ambiguity?
export type EDef = ['def', string, EExpr];        // Define symbol in current scope.
export type ELet = ['let', EDict, ...EExpr[]];    // Create new scope.

// Functions are callable.
export type ECall = [EExpr, EExpr, ...EExpr[]] | [EExpr, ENull];
export type ECallable = EFunc | ENativeFunc;
export type EFunc = ['func', EParams, ...EExpr[]];
export type ENativeFunc = ['native', 'func', EParams, NativeFunc];
export type EParams = string[];

// Actions are invokable.
export type EInvoke = [EExpr, EDict];
export type EInvokable = EAction | ENativeAction;
export type EAction = ['action', EParams, ...EExpr[]];
export type ENativeAction = ['native', 'action', EParams, NativeFunc];
export type EDict = { [arg: string]: EExpr };

// Native func/action interface.
export type NativeFunc = (scope: Scope) => EVal;

// Symbol resolution scope.
export interface Scope {
  readonly name: string;
  readonly parent: Scope;
  readonly world: World;
  readonly names: string[];
  ref(name: string): EVal;
  def(name: string, value: EVal): void;
}

class Frame implements Scope {
  private _defs: { [name: string]: EVal } = {};

  constructor(public name: string, public parent: Scope, public world: World) { }
  get names(): string[] { return Object.keys(this._defs) }
  def(name: string, value: EVal): void { this._defs[name] = value }
  ref(name: string): EVal { return this._defs[name] }
}

export const ScriptError = 'script error';

export function evaluate(scope: Scope, expr: EExpr): EVal {
  try {
    return _eval(scope, expr);
  } catch (e) {
    if ('msg' in e && 'stack' in e) {
      console.log(e.msg);
      console.log(e.stack);
      throw ScriptError;
    }
    throw e;
  }
}

function _eval(scope: Scope, expr: EExpr): EVal {
  switch (typeof expr) {
    case 'number':
    case 'boolean':
    case 'string':
      return expr;

    case 'object':
      let arr = isArray(expr);
      if (arr) {
        if (arr.length == 0) {
          return undefined;
        }

        switch (arr[0]) {
          case 'def': return evalDef(scope, arr as EDef);
          case 'let': return evalLet(scope, arr as ELet);
          case 'get': return evalGet(scope, arr as EGet);
          case 'set': return evalSet(scope, arr as ESet);

          case 'func':
          case 'action':
          case 'native': {
            // TODO: Validate func/action structure.
            return arr as EVal;
          }

          default:
            if (arr.length == 1) {
              // Symbol refs have the form [string]
              return evalRef(scope, expr as ERef);
            } else if (isMap(arr[1])) {
              // Event invocation has form [name, { arg: value, ...}].
              evalInvoke(scope, expr as EInvoke);
            } else {
              // Func call has form [name, value*].
              if (arr.length == 2 && arr[1] == []) {
                // Special case -- ['fn', []] is a no-arg function invocation.
                arr.length = 1;
              }
              return evalCall(scope, arr as ECall);
            }
        }
      } else if (expr instanceof Chunk) {
        return expr as Chunk;
      } else if (expr instanceof Entity) {
        return expr as Entity;
      }
      return undefined;
  }
}

function evalLet(scope: Scope, l: ELet): EVal {
  let dict: EDict = l[1];
  let body = l.slice(2) as EExpr[]; // Type checker isn't quite *that* smart.

  let frame = new Frame("let", scope, scope.world);
  for (let name in dict) {
    frame.def(name, _eval(scope, dict[name]));
  }

  return evalBody(frame, body);
}

function evalRef(scope: Scope, ref: ERef): EVal {
  // TODO: Eval name as expr?
  let name = ref[0];

  let parent = scope;
  while (parent) {
    let result = parent.ref(name);
    if (result !== undefined) {
      return result;
    }
    parent = parent.parent;
  }

  chuck(scope, 'unbound identifier ' + name);
}

function evalGet(scope: Scope, g: EGet): EVal {
  // TODO: This should work with any scope, not just entities.
  let ent = _eval(scope, g[1]) as Entity;
  let name = g[2];
  return ent.ref(name);
}

function evalSet(scope: Scope, s: ESet): EVal {
  // TODO: This should work with any scope, not just entities.
  let ent = _eval(scope, s[1]) as Entity;
  let name = s[2];
  let value = _eval(scope, s[3]);
  ent.def(name, value);
  return value;
}

function evalDef(scope: Scope, def: EDef): EVal {
  let name = def[1];
  let value = _eval(scope, def[2]);
  scope.def(name, value);
  return value;
}

function evalCall(scope: Scope, call: ECall): EVal {
  let val = _eval(scope, call[0]);
  let func = isCallable(val);
  if (!func) {
    chuck(scope, "unable to call " + val);
  }
  let args = call.slice(1)

  let native = func[0] == 'native';
  let params = (native ? func[2] : func[1]) as EParams;

  // Eval all args eagerly.
  // TODO: validate args, lazy evaluation.
  let frame = new Frame("[call]", scope, scope.world);
  for (let i = 0; i < args.length; i++) {
    frame.def(params[i], _eval(scope, args[i]));
  }

  if (native) {
    let fn = func[3] as NativeFunc;
    return evalNative(frame, fn);
  }

  let body = func.slice(2) as EExpr[];
  return evalBody(frame, body);
}

function evalInvoke(scope: Scope, call: EInvoke): void {
  let val = _eval(scope, call[0]);
  let action = isInvokable(val);
  if (!action) {
    chuck(scope, "unable to invoke " + val);
  }
  let dict = call[1] as EDict;

  let native = action[0] == 'native';
  let params = (native ? action[2] : action[1]) as EParams; // TODO: Validate these or something?

  // Eval all args eagerly.
  // TODO: validate args, lazy evaluation.
  let frame: Frame = new Frame("[call]", scope, scope.world);
  for (let name in dict) {
    frame.def(name, _eval(scope, dict[name]));
  }

  // TODO: Find all matching actions.
  if (native) {
    let fn = action[3] as NativeFunc;
    evalNative(frame, fn);
  } else {
    let body = action.slice(2) as EExpr[];
    evalBody(frame, body);
  }
}

function evalBody(scope: Scope, body: EExpr[]): EVal {
  let last: EVal;
  for (let expr of body) {
    last = _eval(scope, expr);
  }
  return last;
}

function evalNative(scope: Scope, fn: NativeFunc): EVal {
  // Call native impl.
  return fn(scope);
}

function isMap(o: any) {
  return (typeof o == 'object' && o.constructor == Object);
}

function isCallable(val: EVal): ECallable {
  if (isFuncy(val, "func")) {
    return val as ECallable;
  }
  return undefined;
}

function isInvokable(val: EVal): EInvokable {
  if (isFuncy(val, "action")) {
    return val as EInvokable;
  }
  return undefined;
}

function isFuncy(val: EVal, funciness: string): boolean {
  let arr = isArray(val);
  if (!arr) {
    return false;
  }
  let i = 0;
  if (arr[i] == 'native') {
    i++;
  }
  if (arr[i] != funciness) {
    return false;
  }
  if (!isArray(arr[++i])) {
    return false;
  }
  if (arr[i] === undefined) {
    return false;
  }
  return true;
}

function isArray(val: any): any[] {
  if (typeof val == "object" && val.constructor == Array) {
    return val as [any];
  }
  return undefined;
}

export function chuck(scope: Scope, msg: string) {
  throw {
    msg: msg,
    stack: printStack(scope),
  };
}

function printStack(scope: Scope): string {
  let msg = "";
  while (scope) {
    msg += `[${scope.name}] - `
    for (let key of scope.names) {
      msg += `${key}: ${printVal(scope.ref(key))} `
    }
    msg += "\n";
    scope = scope.parent;
  }
  return msg;
}

function printVal(val: EVal): string {
  switch (typeof val) {
    case "object":
      if (isCallable(val)) return "[func]";
      if (isInvokable(val)) return "[action]";
      if (val instanceof Chunk) return `[chunk ${(val as Chunk).id}]`
      if (val instanceof Entity) return `[ent ${(val as Entity).id}]`
      return "[expr]";
    default:
      return "" + val;
  }
}
