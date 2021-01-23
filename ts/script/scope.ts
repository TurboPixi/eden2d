import { _eval } from "./eval";
import { EDict, EExpr, ESym, isDict, nil, symName, $, chuck, isSym, _callerTag, _parentTag, EFunc, _funcTag, _parent, _parentName } from "./script";

export type Scope = IScope | EDict;

export const _specials = {
  "[parent]": true, // _parentTag
  "[caller]": true, // _callerTag
  "[func]": true,   // _funcTag
}

export interface IScope {
  readonly names: string[];
  ref(sym: ESym): EExpr;
  def(sym: ESym, value: EExpr): void;
}

class RootScope implements IScope {
  private _defs: EDict = {};
  get names(): string[] { return Object.getOwnPropertyNames(this._defs); }
  ref(sym: ESym): EExpr { return this._defs[symName(sym)]; }
  def(sym: ESym, value: EExpr): void { this._defs[symName(sym)] = value; }
}

export const _root = new RootScope();

// Scope utilities, that understand both Dict and IScope.
export function isIScope(val: EExpr): IScope {
  return (typeof val == 'object') && ('def' in val) && ('ref' in val) &&
    ('names' in val) ? (val as IScope) : nil;
}

export function scopeFind(scope: Scope, sym: ESym): Scope {
  sym = translateSym(sym);

  while (scope) {
    if (scopeExists(scope, sym)) {
      return scope;
    }
    if (scope == scopeParent(scope)) {
      debugger;
    }
    scope = scopeParent(scope);
  }
  return nil;
}

export function isScope(val: EExpr): Scope {
  let dict = isDict(val);
  if (dict) {
    return dict;
  }
  return isIScope(val);
}

export function scopeNew(parent: Scope, caller: Scope, func: EFunc): Scope {
  return {
    '[parent]': parent,
    '[caller]': caller,
    '[func]': func
  };
}

export function scopeExists(scope: Scope, sym: ESym): boolean {
  let iscope = isIScope(scope);
  if (iscope) {
    return iscope.ref(sym) !== nil;
  }
  let dict = scope as EDict;
  return dict[symName(sym)] !== nil;
}

export function scopeEval(scope: Scope, sym: ESym): EExpr {
  return _eval(scope, scopeRef(scope, sym));
}

// For special symbol forms, like ^ that translate to internal ones like [parent].
export function translateSym(sym: ESym): ESym {
  if (symName(sym) == _parentName) {
    sym = _parentTag;
  }
  return sym;
}

export function scopeRef(scope: Scope, sym: ESym): EExpr {
  sym = translateSym(sym);
  let iscope = isIScope(scope);
  if (iscope) {
    return iscope.ref(sym);
  }
  let dict = scope as EDict;
  return dict[symName(sym)];
}

export function scopeDef(scope: Scope, sym: ESym, value: EExpr): EExpr {
  sym = translateSym(sym);
  let iscope = isIScope(scope);
  if (iscope) {
    iscope.def(sym, value);
  } else {
    let dict = scope as EDict;
    dict[symName(sym)] = value;
  }
  return value;
}

export function scopeNames(scope: Scope): string[] {
  let iscope = isIScope(scope);
  if (iscope) {
    return iscope.names;
  }
  let dict = scope as EDict;
  return Object.getOwnPropertyNames(dict).filter((name) => !(name in _specials));
}

export function scopeFunc(scope: Scope): EFunc {
  return scopeRef(scope, _funcTag) as EFunc;
}

export function scopeCaller(scope: Scope): Scope {
  return scopeRef(scope, _callerTag) as Scope;
}

export function scopeParent(scope: Scope): Scope {
  return scopeRef(scope, _parentTag) as Scope;
}

export function lookupSym(scope: Scope, sym: ESym): EExpr {
  if (symName(sym) == 'scope') {
    return scope;
  }

  let target = scopeFind(scope, sym);
  if (target !== nil) {
    return scopeRef(target, sym);
  }

  return nil;
}

export function locNum(scope: Scope, sym: ESym): number {
  return expectNum(scope, lookupSym(scope, sym));
}

export function expectNum(scope: Scope, value: EExpr): number {
  if (typeof value != 'number') {
    chuck(scope, `${value} is not a number`);
  }
  return value as number;
}

export function locStr(scope: Scope, sym: ESym): string {
  return expectStr(scope, lookupSym(scope, sym));
}

export function expectStr(scope: Scope, value: EExpr): string {
  if (typeof value != 'string') {
    chuck(scope, `${value} is not a string`);
  }
  return value as string;
}

export function locSym(scope: Scope, sym: ESym): ESym {
  return expectSym(scope, lookupSym(scope, sym));
}

export function expectSym(scope: Scope, value: EExpr): ESym {
  let vsym = isSym(value);
  if (!vsym) {
    chuck(scope, `${value} is not a symbol`);
  }
  return vsym;
}

export function locScope(scope: Scope, sym: ESym): Scope {
  return expectScope(scope, lookupSym(scope, sym));
}

export function expectScope(scope: Scope, value: EExpr): Scope {
  let vscope = isScope(value);
  if (!vscope) {
    chuck(scope, `${value} is not a dictionary`);
  }
  return vscope;
}
