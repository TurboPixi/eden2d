import { Dict, dictFind, dictRef, isEDict } from "./dict";
import { _eval } from "./eval";
import { chuck, EExpr, ESym, isSym, nil, symName, _callerTag, _nameTag, _parentTag } from "./script";

export function scopeNew(parent: Dict, caller: Dict, name: string): Dict {
  return {
    '[parent]': parent,
    '[caller]': caller,
    '[name]': name,
  };
}

export function scopeEval(scope: Dict, sym: ESym): EExpr {
  return _eval(scope, dictRef(scope, sym));
}

export function scopeName(scope: Dict): string {
  return dictRef(scope, _nameTag) as string || "";
}

export function scopeCaller(scope: Dict): Dict {
  return dictRef(scope, _callerTag) as Dict;
}

export function lookupSym(scope: Dict, sym: ESym): EExpr {
  if (symName(sym) == 'scope') {
    return scope;
  }

  let target = dictFind(scope, sym);
  if (target !== nil) {
    return dictRef(target, sym);
  }

  return nil;
}

export function locNum(scope: Dict, sym: ESym): number {
  return expectNum(scope, lookupSym(scope, sym));
}

export function expectNum(scope: Dict, value: EExpr): number {
  if (typeof value != 'number') {
    chuck(scope, `${value} is not a number`);
  }
  return value as number;
}

export function locStr(scope: Dict, sym: ESym): string {
  return expectStr(scope, lookupSym(scope, sym));
}

export function expectStr(scope: Dict, value: EExpr): string {
  if (typeof value != 'string') {
    chuck(scope, `${value} is not a string`);
  }
  return value as string;
}

export function locSym(scope: Dict, sym: ESym): ESym {
  return expectSym(scope, lookupSym(scope, sym));
}

export function expectSym(scope: Dict, value: EExpr): ESym {
  let vsym = isSym(value);
  if (!vsym) {
    chuck(scope, `${value} is not a symbol`);
  }
  return vsym;
}

export function locScope(scope: Dict, sym: ESym): Dict {
  return expectScope(scope, lookupSym(scope, sym));
}

export function expectScope(scope: Dict, value: EExpr): Dict {
  let vscope = isEDict(value);
  if (!vscope) {
    chuck(scope, `${value} is not a dictionary`);
  }
  return vscope;
}
