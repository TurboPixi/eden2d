import { chuck, EVal, Scope, _self, _set, $, _eval, isArray, evalBody, ScopeType, EDict, _func, isString, isDict, expr } from "./script";

export const _add = $('+');
export const _newChunk = $('newChunk');
export const _new = $('new');
export const _move = $('move');
export const _jump = $('jump');
export const _topWith = $('topWith');

class RootScope implements Scope {
  private _defs: EDict = {};

  get type() { return ScopeType.ROOT }
  get name() { return "[root]" }
  get self() { return this }
  get parent(): Scope { return null }
  get names(): string[] { return Object.keys(this._defs); }
  ref(name: string): EVal { return this._defs[name]; }
  def(name: string, value: EVal): void { this._defs[name] = value; }
}

export const _root = new RootScope();

_root.def("get", [_func, ['obj', 'name'], function (scope: Scope): EVal {
  let obj = _eval(scope, scope.ref('obj')) as any;
  let name = isString(_eval(scope, scope.ref('name')));
  if (!name) {
    chuck(scope, `cannot get ${obj}.${name}`);
  }

  // This is a bit gross, but without js instanceof for interfaces, we don't have a lot of options.
  if (typeof obj['ref'] == 'function') {
    return (obj as Scope).ref(name);
  }

  let dict = isDict(obj);
  if (dict) {
    return dict[name] as EVal;
  }

  chuck(scope, `cannot get ${obj}.${name}`);
}]);

_root.def('set', [_func, ['obj', 'name', 'value'], function (scope: Scope): EVal {
  let obj = _eval(scope, scope.ref('obj')) as any;
  let name = isString(_eval(scope, scope.ref('name')));
  let value = _eval(scope, scope.ref('value'));
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

_root.def('if', [_func, ['expr', 'then', 'else'], function (scope: Scope): EVal {
  // if:
  let b = _eval(scope.parent, scope.ref('expr'));
  if (typeof b != "boolean") {
    chuck(scope, `${b} must be boolean`);
  }

  if (b) {
    // then:
    let thenList = scope.ref('then');
    let then = isArray(thenList);
    if (!then) {
      chuck(scope, `${thenList} must be a list`);
    }
    return _eval(scope.parent, expr(then));
  }

  // else:
  let elseList = scope.ref('else');
  if (elseList !== undefined) {
    let els = isArray(elseList);
    if (!els) {
      chuck(scope, `${elseList} must be a list`);
    }
    return _eval(scope.parent, expr(els));
  }
  return undefined;
}]);

_root.def('log', [_func, ['msg'], function (scope: Scope): EVal {
  let msg = locStr(scope, 'msg');
  console.log(msg);
  return undefined;
}]);

_root.def('+', [_func, ['x', 'y'], function (scope: Scope): EVal {
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
