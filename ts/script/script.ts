// Values.
export type EVal = undefined | number | boolean | string | EId | EList | EDict | Scope;
export type EList = EVal[];
export type EDict = { [arg: string]: EVal };

// Expressions. These overlap with EList, but only when evaluated.
export type EExpr = EVal | ECallable | ECall | ELet | ESet | EGet;
export type EId = { _expr_id: EExpr };
export type ELet = [KLet, EDict, ...EExpr[]];
export type EGet = [KGet, EExpr, EExpr];        // TODO: Merge into call without ambiguity?
export type ESet = [KSet, EExpr, EExpr, EExpr]; // ...
export type ECall = [EExpr, EExpr, ...EExpr[]] | [EExpr, []];
export type ECallable = EFunc | ENativeFunc;
export type EFunc = [KFunc, EParams, ...EExpr[]];
export type ENativeFunc = [KNative, EParams, NativeFunc];
export type EParams = string[];

// Keywords.
export type KGet = { _expr_key: 'get' };
export type KSet = { _expr_key: 'set' };
export type KLet = { _expr_key: 'let' };
export type KFunc = { _expr_key: 'func' };
export type KNative = { _expr_key: 'native' };

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
  readonly names: string[];
  ref(name: string): EVal;
  def(name: string, value: EVal): void;
}

class Frame implements Scope {
  private _defs: EDict = {};

  constructor(public type: ScopeType, public self: EVal, public name: string, public parent: Scope) { }
  get names(): string[] { return Object.keys(this._defs) }
  def(name: string, value: EVal): void { this._defs[name] = value }
  ref(name: string): EVal { return this._defs[name] as EVal }
}

export const ScriptError = 'script error';

export const _get: KGet = { _expr_key: 'get' };
export const _set: KSet = { _expr_key: 'set' };
export const _let: KLet = { _expr_key: 'let' };
export const _func: KFunc = { _expr_key: 'func' };
export const _native: KNative = { _expr_key: 'native' };
export const _self = _('self');

export function _(e: string): EId {
  return { _expr_id: e };
}

export function chuck(scope: Scope, msg: string) {
  throw {
    msg: msg,
    stack: printStack(scope),
  };
}

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

        if (arr[0]._expr_key) {
          switch (arr[0]._expr_key) {
            case 'let': return evalLet(scope, arr as ELet);
            case 'get': return evalGet(scope, arr as EGet);
            case 'set': return evalSet(scope, arr as ESet);

            case 'func':
            case 'action':
            case 'native': {
              // TODO: Validate func/action structure.
              return arr as EVal;
            }
          }
        }

        // Func call has form [name, value*].
        if (arr.length == 2 && arr[1] == []) {
          // Special case -- ['fn', []] is a no-arg function invocation.
          arr.length = 1;
        }
        return evalCall(scope, arr as ECall);
      }

      if ('_expr_id' in expr) {
        return evalRef(scope, expr as EId);
      }

      // TODO: EList?
      let dict = isDict(expr);
      if (dict) { return dict }

      // TODO: Validate is scope or something otherwise legal?
      return expr as EVal;
  }
}

function evalLet(scope: Scope, l: ELet): EVal {
  let dict: EDict = l[1];
  let body = l.slice(2) as EExpr[]; // Type checker isn't quite *that* smart.

  let frame = new Frame(ScopeType.LET, undefined, 'let', scope);
  for (let name in dict) {
    frame.def(name, _eval(scope, dict[name]));
  }

  return evalBody(frame, body);
}

function evalRef(scope: Scope, id: EId): EVal {
  let name = isString(_eval(scope, id._expr_id));

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
  chuck(scope, 'missing self');
}

function evalGet(scope: Scope, g: EGet): EVal {
  let target = _eval(scope, g[1]) as any;
  let name = isString(_eval(scope, g[2]));
  if (!name) {
    chuck(scope, `cannot get ${g[1]}.${g[2]}`);
  }

  // This is a bit gross, but without js instanceof for interfaces, we don't have a lot of options.
  if (typeof target['ref'] == 'function') {
    return (target as Scope).ref(name);
  }

  let dict = isDict(target);
  if (dict) {
    return dict[name] as EVal;
  }

  chuck(scope, `cannot get ${g[1]}.${g[2]}`);
}

function evalSet(scope: Scope, s: ESet): EVal {
  let target = _eval(scope, s[1]) as any;
  let name = isString(_eval(scope, s[2]));
  let value = _eval(scope, s[3]);
  if (!name) {
    chuck(scope, `cannot set ${s[1]}.${s[2]}`);
  }

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

  chuck(scope, `cannot set ${s[1]}.${s[2]}`);
}

function evalCall(scope: Scope, call: ECall): EVal {
  let val = _eval(scope, call[0]);
  let func = isCallable(val);
  if (!func) {
    chuck(scope, 'unable to call ' + val);
  }
  let args = call.slice(1)

  let params = func[1] as EParams;

  // Build stack frame.
  let frame = new Frame(ScopeType.FUNC, undefined, '[call]', scope);
  for (let i = 0; i < args.length; i++) {
    frame.def(params[i], _eval(scope, args[i]));
  }

  if (kNative(func[0])) {
    // Call native impl.
    let fn = func[2] as NativeFunc;
    return fn(frame);
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

function kFunc(expr: any): boolean {
  return ('_expr_key' in expr) && expr._expr_key == 'func';
}

function kNative(expr: any): boolean {
  return ('_expr_key' in expr) && expr._expr_key == 'native';
}

function isCallable(val: EExpr): ECallable {
  let arr = isArray(val);
  if (!arr || arr.length < 3) {
    // Not array or not long enough.
    return undefined;
  }
  if (!kFunc(arr[0]) && !kNative(arr[0])) {
    // Missing func keyword.
    return undefined;
  }
  if (!isArray(arr[1])) {
    // No parameter list.
    return undefined;
  }
  return val as ECallable;
}

function isString(val: any): string {
  if (typeof val == "string") {
    return val;
  }
  return undefined;
}

function isArray(val: any): any[] {
  if (typeof val == 'object' && val.constructor == Array) {
    return val;
  }
  return undefined;
}

function isDict(val: any): EDict {
  if (typeof val == 'object' && val.constructor == Object) {
    return val as EDict;
  }
  return undefined;
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

function printVal(val: EExpr): string {
  switch (typeof val) {
    case 'object':
      if (isCallable(val)) return '[func]';
      return `[${val.constructor.name}]`;
    default:
      return '' + val;
  }
}
