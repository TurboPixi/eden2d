import { chuck, Scope, $, _eval, isList, ScopeType, EDict, isString, isDict, EExpr, nil, invoke } from "./script";

export const _self = $('self');
export const _get = $('get');
export const _set = $('set');
export const _if = $('if');
export const _log = $('log');
export const _add = $('+');

class RootScope implements Scope {
  private _defs: EDict = {};

  get type() { return ScopeType.ROOT }
  get name() { return "[root]" }
  get self() { return this }
  get parent(): Scope { return null }
  get names(): string[] { return Object.keys(this._defs); }
  ref(name: string): EExpr { return this._defs[name]; }
  def(name: string, value: EExpr): void { this._defs[name] = value; }
}

export const _root = new RootScope();

_root.def("get", [{obj:nil, name:nil}, function (scope: Scope): EExpr {
  let obj = scope.ref('obj') as any;
  let name = isString(scope.ref('name'));
  if (!name) {
    chuck(scope, `cannot get ${obj}.${name}`);
  }

  // This is a bit gross, but without js instanceof for interfaces, we don't have a lot of options.
  if (typeof obj['ref'] == 'function') {
    return (obj as Scope).ref(name);
  }

  let dict = isDict(obj);
  if (dict) {
    return dict[name];
  }

  chuck(scope, `cannot get ${obj}.${name}`);
}]);

_root.def('set', [{obj:nil, name:nil, value:nil}, function (scope: Scope): EExpr {
  let obj = scope.ref('obj') as any;
  let name = isString(scope.ref('name'));
  let value = scope.ref('value');
  if (!name) {
    chuck(scope, `cannot set ${obj}.${name}`);
  }

  // This is a bit gross, but without js instanceof for interfaces, we don't have a lot of options.
  if (typeof obj['def'] == 'function') {
    (obj as Scope).def(name, value);
    return value;
  }

  let dict = isDict(obj);
  if (dict) {
    dict[name] = value;
    return value;
  }

  chuck(scope, `cannot set ${obj}.${name}`);
}]);

_root.def('if', [{expr:nil, then:nil, else:nil}, function (scope: Scope): EExpr {
  // if:
  let b = scope.ref('expr');
  if (typeof b != "boolean") {
    chuck(scope, `${b} must be boolean`);
  }

  if (b) {
    // then:
    let thenList = scope.ref('then');
    let then = isList(thenList);
    if (!then) {
      chuck(scope, `${thenList} must be a list`);
    }
    return invoke(scope.parent, then);
  }

  // else:
  let elseList = scope.ref('else');
  if (elseList !== undefined) {
    let els = isList(elseList);
    if (!els) {
      chuck(scope, `${elseList} must be a list`);
    }
    return invoke(scope.parent, els);
  }
  return undefined;
}]);

_root.def('log', [{msg:nil}, function (scope: Scope): EExpr {
  let msg = locStr(scope, 'msg');
  console.log(msg);
  return undefined;
}]);

_root.def('+', [{x:nil, y:nil}, function(scope: Scope): EExpr {
  return locNum(scope, 'x') + locNum(scope, 'y');
}]);

export function locNum(scope: Scope, name: string): number {
  let value = scope.ref(name) as number;
  if (typeof value != "number") {
    chuck(scope, `${name}: ${value} is not a number`);
  }
  return value;
}

export function locStr(scope: Scope, name: string): string {
  let value = scope.ref(name) as string;
  if (typeof value != "string") {
    chuck(scope, `${name}: ${value} is not a string`);
  }
  return value;
}
