import { Chunk, isChunk } from "../chunk";
import { Entity, isEntity } from "../entity";
import { isWorld, World } from "../world";

// Expressions.
// TODO: Expressions and vals are all mixed up, but not coherently. You can get expressions into a val through
// the dict type, but there's no way to avoid an expression being evaluated. Fix all this crap up and ensure
// that either expressions can be values, or that there's no way to sneak them in the back door.
// Some overlap here with 'if', Lisp-y 'special forms', and possibly lazy evaluation.
export type EExpr = EVal | ECall | ELet | ERef | ESet | EGet | ESelf;
export type EVal = number | boolean | string | EList | EDict | ECallable | ENull | World | Chunk | Entity;
export type ENull = [];
export type ESelf = ['self'];
export type EList = EVal[];
export type EDict = { [arg: string]: EExpr };
export type ERef = [string];                      // TODO: name as expr?
export type EGet = ['get', EExpr, string];        // TODO: name as expr?
export type ESet = ['set', EExpr, string, EExpr]; // TODO: Merge into ref without call ambiguity?
export type ELet = ['let', EDict, ...EExpr[]];    // Create new scope.

// Functions are callable.
export type ECall = [EExpr, EExpr, ...EExpr[]] | [EExpr, ENull];
export type ECallable = EFunc | ENativeFunc;
export type EFunc = ['func', EParams, ...EExpr[]];
export type ENativeFunc = ['native', 'func', EParams, NativeFunc];
export type EParams = string[];

// Native func/action interface.
export type NativeFunc = (scope: Scope) => EVal;

// Symbol resolution scope.
export enum ScopeType {
  WORLD = 1,
  CHUNK = 2,
  ENT = 3,
  FUNC = 4,
  LET = 5,
}

export interface Scope {
  readonly type: ScopeType;
  readonly name: string;
  readonly self: EVal;
  readonly parent: Scope;
  readonly world: World;
  readonly names: string[];
  ref(name: string): EVal;
  def(name: string, value: EVal): void;
}

class Frame implements Scope {
  private _defs: { [name: string]: EVal } = {};

  constructor(public type: ScopeType, public self: EVal, public name: string, public parent: Scope, public world: World) { }
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
            } else {
              // Func call has form [name, value*].
              if (arr.length == 2 && arr[1] == []) {
                // Special case -- ['fn', []] is a no-arg function invocation.
                arr.length = 1;
              }
              return evalCall(scope, arr as ECall);
            }
        }
      }

      let ent = isEntity(expr);
      if (ent) { return ent }
      let chunk = isChunk(expr);
      if (chunk) { return chunk }
      let world = isWorld(expr);
      if (world) { return world }
      let dict = isDict(expr);
      if (dict) { return dict }
      // TODO: EList?
      return undefined;
  }
}

function evalLet(scope: Scope, l: ELet): EVal {
  let dict: EDict = l[1];
  let body = l.slice(2) as EExpr[]; // Type checker isn't quite *that* smart.

  let frame = new Frame(ScopeType.LET, undefined, 'let', scope, scope.world);
  for (let name in dict) {
    frame.def(name, _eval(scope, dict[name]));
  }

  return evalBody(frame, body);
}

function evalRef(scope: Scope, ref: ERef): EVal {
  // TODO: Eval name as expr?
  let name = ref[0];

  // Special case: self.
  if (name == 'self') {
    return evalSelf(scope);
  }

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

function evalSelf(scope: Scope): EVal {
  let parent = scope;
  while (parent) {
    switch (parent.type) {
      case ScopeType.WORLD:
      case ScopeType.CHUNK:
      case ScopeType.ENT:
        return parent.self;
    }
    parent = parent.parent;
  }

  chuck(scope, 'unbound identifier ' + name);
}

function evalGet(scope: Scope, g: EGet): EVal {
  let target = _eval(scope, g[1]) as any;
  let name = g[2];

  // This is a bit gross, but without js instanceof for interfaces, we don't have a lot of options.
  if (typeof target['ref'] == 'function') {
    return (target as Scope).ref(name);
  }

  let dict = isDict(target);
  if (dict) {
    return dict[name] as EVal;
  }
  return undefined;
}

function evalSet(scope: Scope, s: ESet): EVal {
  let target = _eval(scope, s[1]) as Entity;
  let name = s[2];
  let value = _eval(scope, s[3]);

  // This is a bit gross, but without js instanceof for interfaces, we don't have a lot of options.
  if (typeof target['def'] == 'function') {
    (target as Scope).def(name, value);
    return value;
  }

  let dict = isDict(target);
  if (dict) {
    dict[name] = value;
    return value;
  }
  return undefined;
}

function evalCall(scope: Scope, call: ECall): EVal {
  let val = _eval(scope, call[0]);
  let func = isCallable(val);
  if (!func) {
    chuck(scope, 'unable to call ' + val);
  }
  let args = call.slice(1)

  let native = func[0] == 'native';
  let params = (native ? func[2] : func[1]) as EParams;

  // Eval all args eagerly.
  // TODO: validate args, lazy evaluation.
  let frame = new Frame(ScopeType.FUNC, undefined, '[call]', scope, scope.world);
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
  let arr = isArray(val);
  if (!arr) {
    return undefined;
  }
  let i = 0;
  if (arr[i] == 'native') {
    i++;
  }
  if (arr[i] != 'func') {
    return undefined;
  }
  if (!isArray(arr[++i])) {
    return undefined;
  }
  if (arr[i] === undefined) {
    return undefined;
  }
  return val as ECallable;
}

function isArray(val: any): any[] {
  if (typeof val == 'object' && val.constructor == Array) {
    return val as [any];
  }
  return undefined;
}

function isDict(val: any): EDict {
  if (typeof val == 'object' && val.constructor == Object) {
    return val as EDict;
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
  let msg = '';
  while (scope) {
    msg += `[${scope.name}] - `
    for (let key of scope.names) {
      msg += `${key}: ${printVal(scope.ref(key))} `
    }
    msg += '\n';
    scope = scope.parent;
  }
  return msg;
}

function printVal(val: EVal): string {
  switch (typeof val) {
    case 'object':
      if (isCallable(val)) return '[func]';
      if (val instanceof Chunk) return `[chunk ${(val as Chunk).id}]`
      if (val instanceof Entity) return `[ent ${(val as Entity).id}]`
      return '[expr]';
    default:
      return '' + val;
  }
}
