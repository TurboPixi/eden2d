import { _eval } from "./eval";
import { EDict, EExpr, ESym, nil, symName, $, chuck, isSym, _callerTag, _parentTag, _parent, _parentName, _nameTag, isBlock } from "./script";

export type Dict = IDict | EDict;

export const _specials = {
  "[parent]": true, // _parentTag
  "[caller]": true, // _callerTag
  "[name]": true,   // _nameTag
}

export interface IDict {
  readonly names: string[];
  ref(sym: ESym): EExpr;
  def(sym: ESym, value: EExpr): void;
}

class RootScope implements IDict {
  private _defs: EDict = {};
  get names(): string[] { return Object.getOwnPropertyNames(this._defs); }
  ref(sym: ESym): EExpr { return this._defs[symName(sym)]; }
  def(sym: ESym, value: EExpr): void { this._defs[symName(sym)] = value; }
}

export const _root = new RootScope();

// Dict utilities, that understand both EDict and IDict.
export function isIDict(val: EExpr): IDict {
  return (typeof val == 'object') && ('def' in val) && ('ref' in val) &&
    ('names' in val) ? (val as IDict) : nil;
}

export function dictFind(dict: Dict, sym: ESym): Dict {
  sym = translateSym(sym);

  while (dict) {
    if (dictExists(dict, sym)) {
      return dict;
    }
    if (dict == dictParent(dict)) {
      debugger;
    }
    dict = dictParent(dict);
  }
  return nil;
}

export function dictParent(dict: Dict): Dict {
  return dictRef(dict, _parentTag) as Dict;
}

export function isDict(val: EExpr): Dict {
  let dict = isEDict(val);
  if (dict) {
    return dict;
  }
  return isIDict(val);
}

export function isEDict(val: EExpr): EDict {
  if (val && typeof val == 'object' && val.constructor == Object && !isSym(val) && !isBlock(val)) {
    return val as EDict;
  }
  return nil;
}

export function dictExists(dict: Dict, sym: ESym): boolean {
  let idict = isIDict(dict);
  if (idict) {
    return idict.ref(sym) !== nil;
  }
  let edict = dict as EDict;
  return edict[symName(sym)] !== nil;
}

// For special symbol forms, like ^ that translate to internal ones like [parent].
export function translateSym(sym: ESym): ESym {
  if (symName(sym) == _parentName) {
    sym = _parentTag;
  }
  return sym;
}

export function dictRef(dict: Dict, sym: ESym): EExpr {
  sym = translateSym(sym);
  let idict = isIDict(dict);
  if (idict) {
    return idict.ref(sym);
  }
  let edict = dict as EDict;
  return edict[symName(sym)];
}

export function dictDef(dict: Dict, sym: ESym, value: EExpr): EExpr {
  sym = translateSym(sym);
  let idict = isIDict(dict);
  if (idict) {
    idict.def(sym, value);
  } else {
    let edict = dict as EDict;
    edict[symName(sym)] = value;
  }
  return value;
}

export function dictNames(dict: Dict): string[] {
  let idict = isIDict(dict);
  if (idict) {
    return idict.names;
  }
  let edict = dict as EDict;
  return Object.getOwnPropertyNames(edict).filter((name) => !(name in _specials));
}
