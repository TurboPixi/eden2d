// Values.
export type EVal = undefined | number | boolean | string | EId | EList | EDict | EFunc | Scope;
export type EList = EVal[];
export type EDict = { [arg: string]: EVal };
export type EId = { _expr_id: EExpr };
export type EFunc = [KFunc, EParams, ...EExpr[]] | [KFunc, EParams, NativeFunc];
export type EParams = string[];

// Expressions. These overlap with EList, but only when evaluated.
export type EExpr = EVal | ECall | ELet;
export type ELet = [EDict, ...EExpr[]];
export type ECall = [EExpr, ...EExpr[]];

// Keywords.
export type KFunc = { _expr_func: true };

// Native func/action interface.
export type NativeFunc = (scope: Scope) => EVal;

// Symbol resolution scope.
// TODO: Separate call stack from symbol resolution scope. We have a weird hybrid scope model now, largely by accident.
export enum ScopeType {
  ROOT = 0,
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

export const ScriptError = 'script error';

export const _func: KFunc = { _expr_func: true };
export const _get = $('get');
export const _set = $('set');
export const _self = $('self');

class Frame implements Scope {
  private _defs: EDict = {};
  constructor(public type: ScopeType, public self: EVal, public name: string, public parent: Scope) { }

  get names(): string[] { return Object.keys(this._defs) }
  def(name: string, value: EVal): void { this._defs[name] = value }
  ref(name: string): EVal { return this._defs[name] as EVal }
}

// Makes an identifier.
export function $(e: string): EId {
  return { _expr_id: e };
}

// Makes a quoted list (unevaluated).
export function _(...arr: EVal[]): EList {
  (arr as any)['_expr_list'] = true;
  return arr as EList;
}

// Turns a list into an expression, so that it will be evaluated.
export function expr(arr: EList): EExpr {
  delete (arr as any)['_expr_list'];
  return arr as EExpr;
}

// Chuck an exception (used internally, and by native builtins).
export function chuck(scope: Scope, msg: string) {
  throw {
    msg: msg,
    stack: printStack(scope),
  };
}

// Evaluate an expression in a given scope.
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

// Internal evaluate implementation, that doesn't catch or log exceptions.
export function _eval(scope: Scope, expr: EExpr): EVal {
  switch (typeof expr) {
    case 'number':
    case 'boolean':
    case 'string':
      // Primitve value.
      return expr;

    case 'object':
      let arr = isArray(expr);
      if (arr) {
        // _([list, of, things]) is a literal list, not evaluated.
        if ('_expr_list' in arr) {
          return arr;
        }

        // [] === undefined.
        if (arr.length == 0) {
          return undefined;
        }

        // Keywords, not function call.
        if (arr[0]._expr_func) {
          // TODO: Validate func structure.
          return arr as EVal;
        }

        if (isDict(arr[0])) {
          return evalLet(scope, arr as ELet)
        }
        return evalCall(scope, arr as ECall);
      }

      // {_expr_id: 'foo'} is an identifier.
      if ('_expr_id' in expr) {
        return evalId(scope, expr as EId);
      }

      // Maybe a dictionary?
      let dict = isDict(expr);
      if (dict) { return dict }

      // Some other value object (World, Chunk, Entity, Scope). Leave alone.
      // TODO: Validate is scope or something otherwise legal?
      return expr as EVal;
  }
}

function evalLet(scope: Scope, l: ELet): EVal {
  let dict: EDict = l[0];
  let body = l.slice(1);

  let frame = new Frame(ScopeType.LET, undefined, 'let', scope);
  for (let name in dict) {
    frame.def(name, _eval(scope, dict[name]));
  }

  return evalBody(frame, body);
}

function evalId(scope: Scope, id: EId): EVal {
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

function evalCall(scope: Scope, call: ECall): EVal {
  let val = _eval(scope, call[0]);
  let func = isFunc(val);
  if (!func) {
    chuck(scope, `unable to call ${call[0]}: ${val}`);
  }
  let args = call.slice(1)

  let params = func[1] as EParams;

  // Build stack frame.
  let frame = new Frame(ScopeType.FUNC, undefined, '[call]', scope);
  for (let i = 0; i < args.length; i++) {
    frame.def(params[i], _eval(scope, args[i]));
  }

  if (typeof func[2] == "function") {
    // Call native impl.
    let fn = func[2] as NativeFunc;
    return fn(frame);
  }

  let body = func.slice(2) as EExpr[];
  return evalBody(frame, body);
}

export function evalBody(scope: Scope, body: EExpr[]): EVal {
  let last: EVal;
  for (let expr of body) {
    last = _eval(scope, expr);
  }
  return last;
}

function kFunc(expr: any): boolean {
  return !!expr['_expr_func'];
}

function isFunc(val: EExpr): EFunc {
  let arr = isArray(val);
  if (!arr || arr.length < 3) {
    // Not array or not long enough.
    return undefined;
  }
  if (!kFunc(arr[0])) {
    // Missing func keyword.
    return undefined;
  }
  if (!isArray(arr[1])) {
    // No parameter list.
    return undefined;
  }
  return val as EFunc;
}

export function isString(val: any): string {
  if (typeof val == "string") {
    return val;
  }
  return undefined;
}

export function isArray(val: any): any[] {
  if (typeof val == 'object' && val.constructor == Array) {
    return val;
  }
  return undefined;
}

export function isDict(val: any): EDict {
  if (typeof val == 'object' && val.constructor == Object &&
      !val['_expr_func'] && !val['_expr_id']) {
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
      if (isFunc(val)) return '[func]';
      return `[${val.constructor.name}]`;
    default:
      return '' + val;
  }
}
