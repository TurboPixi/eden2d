import { registerDefroster } from "./freezer";
import { _print } from "./print";
import { EDict, EExpr, ESym, nil, symName, $, chuck, isSym, _callerTag, _parentTag, _parent, _parentName, _nameTag, isBlock, _parentTagName } from "./script";

export type Dict = IDict | EDict;

export const _specialProps = {
  "[parent]": true, // _parentTag
  "[caller]": true, // _callerTag
}

export interface IDict {
  readonly names: string[];
  exists(sym: ESym): boolean;
  ref(sym: ESym): EExpr;
  def(sym: ESym, value: EExpr): void;
}

class RootEnv implements IDict {
  private _defs: EDict = {};

  get names(): string[] { return Object.getOwnPropertyNames(this._defs); }
  exists(sym: ESym): boolean {return symName(sym) in this._defs; }
  ref(sym: ESym): EExpr { return this._defs[symName(sym)]; }
  def(sym: ESym, value: EExpr): void { this._defs[symName(sym)] = value; }
  native(): any { return { native: 'root' } }
}

export const _root = new RootEnv();

export function isDict(val: EExpr): Dict {
  let dict = isEDict(val);
  if (dict) {
    return dict;
  }
  return isIDict(val);
}

export function dictFind(dict: Dict, sym: ESym): Dict {
  sym = translateSym(sym);

  while (dict) {
    if (dictExists(dict, sym)) {
      return dict;
    }
    dict = dictParent(dict);
  }
  return nil;
}

export function dictParent(dict: Dict): Dict {
  return dictRef(dict, _parentTag) as Dict;
}

export function dictExists(dict: Dict, sym: ESym): boolean {
  let idict = isIDict(dict);
  if (idict) {
    return idict.exists(sym);
  }
  let edict = dict as EDict;
  return symName(sym) in edict;
}

export function isEDict(val: EExpr): EDict {
  if (val && typeof val == 'object' && val.constructor == Object && !isSym(val) && !isBlock(val)) {
    return val as EDict;
  }
  return nil;
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
    if (symName(sym) == _parentTagName && value == edict) {
      debugger;
      throw(`cycle in parent chain ${_print(dict)}`)
    }
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
  return Object.getOwnPropertyNames(edict).filter((name) => !(name in _specialProps));
}

function isIDict(val: EExpr): IDict {
  return (typeof val == 'object') && ('def' in val) && ('ref' in val) &&
    ('names' in val) ? (val as IDict) : nil;
}
