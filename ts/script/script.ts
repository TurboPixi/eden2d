// Expressions.
export type EExpr = ENil | EPrim | EId | EList | EDict | Scope | NativeFunc;
export type EPrim = number | boolean | string;
export type EList = EExpr[];
export type EDict = { [arg: string]: EExpr };
export type EId = { _expr_id: EExpr };
export type ENil = undefined;
export type NativeFunc = (scope: Scope) => EExpr;

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

const LitMarker = '_expr_lit';
const IdMarker = '_expr_id';

export const ScriptError = 'script error';
export const nil: ENil = undefined;

// Makes an identifier.
export function $(e: string): EId {
  return { _expr_id: e };
}

// Makes a quoted list (unevaluated).
export function _(...list: EExpr[]): EList {
  (list as any)[LitMarker] = true;
  return list as EList;
}

// Makes a quoted expression (unevaluated).
export function __(expr: EExpr): EExpr {
  (expr as any)[LitMarker] = true; // This does nothing for unboxed primitives, but that's ok because they always eval to themselves.
  return expr;
}

// Chuck an exception (used internally, and by native builtins).
export function chuck(scope: Scope, msg: string) {
  throw {
    msg: msg,
    stack: printStack(scope),
  };
}

export interface Scope {
  readonly type: ScopeType;
  readonly name: string;
  readonly self: EExpr;
  readonly parent: Scope;
  readonly names: string[];
  ref(name: string): EExpr;
  def(name: string, value: EExpr): void;
}

class Frame implements Scope {
  private _defs: EDict = {};
  constructor(public type: ScopeType, public self: EExpr, public name: string, public parent: Scope) { }

  get names(): string[] { return Object.keys(this._defs) }
  def(name: string, value: EExpr): void { this._defs[name] = value }
  ref(name: string): EExpr { return this._defs[name] as EExpr }
}


// Evaluate an expression in a given scope.
export function evaluate(scope: Scope, expr: EExpr): EExpr {
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
export function _eval(scope: Scope, expr: EExpr): EExpr {
  switch (typeof expr) {
    case 'number':
    case 'boolean':
    case 'string':
      // Primitve value.
      return expr;

    case 'object':
      // foo ({_expr_id: 'foo'} at runtime) is an identifier.
      if (IdMarker in expr) {
        return evalId(scope, expr as EId);
      }

      // (thing) is a literal expression, not evaluated.
      if (LitMarker in expr) {
        // Remove the literal marker, so it will get fully evaluated next time.
        delete (expr as any)[LitMarker];
        return expr;
      }

      // [a b c ...] is a list.
      // Treat it as function application.
      let list = isList(expr);
      if (list) {
        return apply(scope, list);
      }

      // {foo:a bar:b ...} is a dict.
      // Treat it as an addition to the current scope.
      let dict = isDict(expr);
      if (dict) {
        evalLet(scope, dict);
        return nil;
      }

    // No idea what this is. Fall through.
  }

  // Some other value object (World, Chunk, Entity, Scope). Leave alone.
  // TODO: Validate is scope or something otherwise legal, so we don't pollute the heap?
  return expr;
}

export function apply(scope: Scope, list: EList): EExpr {
  let val = _eval(scope, list[0]);
  let func = isList(val);
  if (func === undefined) {
    chuck(scope, `can't apply ${list[0]}`);
  }

  // Build stack frame.
  let args = list.slice(1)
  let frame = new Frame(ScopeType.FUNC, undefined, '[apply]', scope);
  let idx = 0;
  let params = isDict(func[idx]);
  if (params) {
    // TODO: Something with default scope. Handle optional params, stacked scopes, missing args, etc.
    let names = Object.getOwnPropertyNames(params); // Gross: must use gOPN() because it preserves insertion order.
    for (let i = 0; i < names.length; i++) {
      frame.def(names[i], _eval(scope, params[names[i]])); // Does it make sense to use this dynamic scope for default arg resolution? Could be wacky but fun.
      if (i == args.length) {
        break;
      }
      frame.def(names[i], _eval(scope, args[i]));
    }
    idx++;
  }

  return invoke(frame, func.slice(idx));
}

export function invoke(frame: Scope, body: EList): EExpr {
  if (typeof body[0] == "function") {
    // Call native impl.
    let fn = body[0] as NativeFunc;
    return fn(frame);
  }

  // Evaluate function body.
  let last: EExpr;
  for (let expr of body) {
    last = _eval(frame, expr);
  }
  return last;
}

// TODO: At present, a "let" dict is evaluated to add/mutate symbols in the current scope, not create a new one.
// There is no block construct to introduce new scopes, only funcs. Maybe that's enough?
function evalLet(scope: Scope, dict: EDict): void {
  for (let name in dict) {
    scope.def(name, _eval(scope, dict[name]));
  }
}

function evalId(scope: Scope, id: EId): EExpr {
  let name = isString(_eval(scope, id[IdMarker]));

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

function evalSelf(scope: Scope): EExpr {
  let parent = scope;
  while (parent) {
    switch (parent.type) {
      case ScopeType.ROOT:
      case ScopeType.WORLD:
      case ScopeType.CHUNK:
      case ScopeType.ENT:
        return parent.self;
    }
    parent = parent.parent;
  }
  chuck(scope, 'missing self');
}

export function isString(val: any): string {
  if (typeof val == "string") {
    return val;
  }
  return undefined;
}

export function isList(val: EExpr): EList {
  if (typeof val == 'object' && val.constructor == Array) {
    return val;
  }
  return undefined;
}

export function isDict(val: EExpr): EDict {
  if (typeof val == 'object' && val.constructor == Object && !isId(val)) {
    return val as EDict;
  }
  return undefined;
}

export function isId(val: EExpr): EExpr {
  if (IdMarker in (val as any)) {
    return (val as EId)._expr_id;
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
      return `[${val.constructor.name}]`;
    default:
      return '' + val;
  }
}
