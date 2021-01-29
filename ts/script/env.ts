import { Dict, dictDef, dictFind, dictNames, dictRef, IDict, isEDict } from "./dict";
import { _eval } from "./eval";
import { chuck, EExpr, EList, ESym, isList, isSym, nil, symName, _callerTag, _callerTagName, _nameTag, _nameTagName, _parentTag, _parentTagName } from "./script";

export class TeeEnv implements IDict {
  constructor(private first: Dict, private second: Dict) {}

  get names(): string[] {
    return dictNames(this.first);
  }

  ref(sym: ESym): EExpr {
    if (symName(sym) == _parentTagName) {
      return this.second;
    }
    return dictRef(this.first, sym);
  }

  def(sym: ESym, value: EExpr): void {
    dictDef(this.first, sym, value);
  }
}

export function envNew(parent: Dict, caller: Dict, name: string): Dict {
  let env: any = {};
  if (parent !== nil) env[_parentTagName] = parent;
  if (caller !== nil) env[_callerTagName] = caller;
  if (name !== nil) env[_nameTagName] = name;
  return env;
}

export function envEval(env: Dict, sym: ESym): EExpr {
  return _eval(env, dictRef(env, sym));
}

export function envName(env: Dict): string {
  return dictRef(env, _nameTag) as string || "";
}

export function envCaller(env: Dict): Dict {
  return dictRef(env, _callerTag) as Dict;
}

export function lookupSym(env: Dict, sym: ESym): EExpr {
  if (symName(sym) == 'env') {
    return env;
  }

  let target = dictFind(env, sym);
  if (target !== nil) {
    return dictRef(target, sym);
  }

  return nil;
}

export function locBool(env: Dict, sym: ESym): boolean {
  return expectBool(env, lookupSym(env, sym));
}

export function expectBool(env: Dict, value: EExpr): boolean {
  if (typeof value != 'boolean') {
    chuck(env, `${value} is not a boolean`);
  }
  return value as boolean;
}

export function locNum(env: Dict, sym: ESym): number {
  return expectNum(env, lookupSym(env, sym));
}

export function expectNum(env: Dict, value: EExpr): number {
  if (typeof value != 'number') {
    chuck(env, `${value} is not a number`);
  }
  return value as number;
}

export function locStr(env: Dict, sym: ESym): string {
  return expectStr(env, lookupSym(env, sym));
}

export function expectStr(env: Dict, value: EExpr): string {
  if (typeof value != 'string') {
    chuck(env, `${value} is not a string`);
  }
  return value as string;
}

export function locSym(env: Dict, sym: ESym): ESym {
  return expectSym(env, lookupSym(env, sym));
}

export function expectSym(env: Dict, value: EExpr): ESym {
  let vsym = isSym(value);
  if (!vsym) {
    chuck(env, `${value} is not a symbol`);
  }
  return vsym;
}

export function locDict(env: Dict, sym: ESym): Dict {
  return expectDict(env, lookupSym(env, sym));
}

export function expectDict(env: Dict, value: EExpr): Dict {
  let venv = isEDict(value);
  if (!venv) {
    chuck(env, `${value} is not a dictionary`);
  }
  return venv;
}

export function locList(env: Dict, sym: ESym): EList {
  return expectList(env, lookupSym(env, sym));
}

export function expectList(env: Dict, value: EExpr): EList {
  let list = isList(value);
  if (!list) {
    chuck(env, `${value} is not a list`);
  }
  return list;
}
