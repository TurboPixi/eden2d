import { _printStack, _print } from "./print";
import { Dict, isEDict, isTagProp } from "./dict";

export type EExpr = ENil | EPrim | ESym | EQuote | EFullQuote | EList | Dict | NativeBlock;
export type EPrim = number | boolean | string | ENil;
export type ENil = undefined;
export type ESym = { '[sym]': string };
export type EQuote = { '[q]': EExpr };
export type EFullQuote = { '[fq]': EExpr };
export type EBlock = { '[block]': [EList, EExpr], '[env]': Dict, '[name]'?: string, '[self]'?: EDict };
export type NativeBlock = (env: Dict) => EExpr;
export type EList = EExpr[];
export type EDict = { [arg: string]: EExpr };

export const QuoteMarker = '[q]';
export const FullQuoteMarker = '[fq]';
export const SymMarker = '[sym]';
export const BlockMarker = '[block]';
export const EnvMarker = '[env]';
export const NameMarker = '[name]';
export const SelfMarker = '[self]';

// Special symbols.
export const _parentName = '^';
export const _parent = $(_parentName);
export const _self = $('@');
export const _env = $('env');
export const nil: ENil = undefined;

// Special forms.
export const _blk = $('|');
export const _do = $('do');
export const _def = $('def');
export const _set = $('set');
export const _exists = $('?');

// Tags.
export const _callerTagName = '[caller]';
export const _nameTagName = '[name]';
export const _nameTag = $(_nameTagName);
export const _callerTag = $(_callerTagName);

// Makes a quoted expression (unevaluated).
export function _(expr: EExpr): EExpr {
  // Quoted primitives are equal to themselves, so no need to do anything here.
  if (typeof expr == 'object') {
    return { '[q]': expr };
  }
  return expr;
}

// Makes a block.
export function __(...exprs: EExpr[]): EList {
  // TODO: Check all cases to make sure this always makes sense.
  let params = isList(exprs[0]);
  if (params && (exprs.length > 1)) {
    return [_blk, params, exprs[1]];
  }
  return [_blk, [], exprs[0]];
}

// Makes an identifier.
export function $(e: string): ESym {
  return { '[sym]': e };
}

// Makes a quoted identifier.
export function $$(e: string): EExpr {
  return _($(e));
}

export function eq(a: EExpr, b: EExpr): boolean {
  switch (typeof a) {
    case "number":
    case "string":
    case "boolean":
    case "undefined":
      return a === b;

    case "object":
      let aList = isList(a), bList = isList(b);
      if (aList && bList && (aList.length == bList.length)) {
        for (var i = 0; i < aList.length; i++) {
          if (!eq(aList[i], bList[i])) {
            return false;
          }
        }
        return true;
      }

      let aDict = isEDict(a), bDict = isEDict(b);
      if (aDict && bDict) {
        let aKeys = Object.keys(aDict);
        let bKeys = Object.keys(bDict);
        if (aKeys.length == bKeys.length) {
          for (let key of aKeys) {
            if (!isTagProp(key)) {
              if (!eq(aDict[key], bDict[key])) {
                return false;
              }
            }
          }
          return true;
        }
      }

      // TODO: Intern blocks so we don't have to engage in this mess?
      let ABlock = isBlock(a), bBlock = isBlock(b);
      if (ABlock && bBlock) {
        return eq(blockExpr(ABlock), blockExpr(bBlock)) &&
          eq(blockParams(ABlock), blockParams(bBlock)) &&
            blockEnv(ABlock) === blockEnv(bBlock); // We can't do deep equality on the env; it will cycle.
      }

      let aSym = isSym(a), bSym = isSym(b);
      if (aSym && bSym) {
        return eq(symName(aSym), symName(bSym));
      }

      // TODO: Other cases?
      return a === b;
  }
}

// Chuck an exception (used internally, and by native builtins).
export function chuck(env: Dict, msg: string) {
  let stack = _printStack(env);
  console.error(msg);
  console.error(stack);
  throw { msg, stack };
}

export function isQuote(val: EExpr): EQuote {
  if (val && typeof val == 'object' && (QuoteMarker in val)) {
    return val as EQuote;
  }
  return nil;
}

export function quoteExpr(q: EQuote): EExpr {
  return q[QuoteMarker];
}

export function isFullQuote(val: EExpr): EFullQuote {
  if (val && typeof val == 'object' && (FullQuoteMarker in val)) {
    return val as EFullQuote;
  }
  return nil;
}

export function fullQuoteExpr(q: EFullQuote): EExpr {
  return q[FullQuoteMarker];
}

export function isString(val: any): string {
  if (typeof val == 'string') {
    return val;
  }
  return nil;
}

export function isList(val: EExpr): EList {
  if (val && typeof val == 'object' && val.constructor == Array) {
    return val;
  }
  return nil;
}

export function isSym(val: EExpr): ESym {
  if (val && (typeof val == "object") && SymMarker in (val as any)) {
    return val as ESym;
  }
  return nil;
}

export function symName(sym: ESym): string {
  return sym[SymMarker];
}

export function isBlock(val: EExpr): EBlock {
  if (val && (typeof val == "object") && BlockMarker in (val as any)) {
    return val as EBlock;
  }
  return nil;
}

export function blockParams(block: EBlock): EList {
  return isList(block[BlockMarker][0]);
}

export function blockExpr(block: EBlock): EExpr {
  return block[BlockMarker][1];
}

export function blockEnv(block: EBlock): Dict {
  return block[EnvMarker];
}

export function blockName(block: EBlock): string {
  return block ? (block[NameMarker] || "") : "";
}

export function blockSelf(block: EBlock): EDict {
  return block[SelfMarker];
}
