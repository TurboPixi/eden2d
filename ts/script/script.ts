import { _printStack, _print } from "./print";
import { Scope, _specials } from "./scope";

export type EExpr = ENil | EPrim | ESym | EQuote | EList | Scope | NativeFunc;
export type EPrim = number | boolean | string | ENil | EOpaque;
export type ENil = undefined;
export type EOpaque = { _expr_opaque: any };
export type ESym = { _expr_sym: string };
export type EQuote = { _expr_quote: EExpr };
export type EFunc = { _expr_func: [EList, EExpr], _expr_scope: Scope, _expr_name?: string, _expr_self?: EDict };
export type NativeFunc = (scope: Scope) => EExpr;
export type EList = EExpr[];
export type EDict = { [arg: string]: EExpr };

const OpaqueMarker = "_expr_opaque";
const QuoteMarker = '_expr_quote';
const SymMarker = '_expr_sym';
const FuncMarker = '_expr_func';

// Special forms.
export const _blk = $('|');
export const _do = $('do');
export const _def = $('def');
export const _set = $('set');
export const _exists = $('?');

// Special symbols.
export const _self = $('@');
export const _caller = $('caller');
export const _func = $('func');
export const _scope = $('scope');
export const _parent = $('parent');
export const nil: ENil = undefined;

// Makes a quoted expression (unevaluated).
export function _(expr: EExpr): EExpr {
  // Quoted primitives are equal to themselves, so no need to do anything here.
  if (typeof expr == 'object') {
    return { _expr_quote: expr };
  }
  return expr;
}

// Makes a func.
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
  return { _expr_sym: e };
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

      let aDict = isDict(a), bDict = isDict(b);
      if (aDict && bDict) {
        let aKeys = Object.keys(aDict);
        let bKeys = Object.keys(bDict);
        if (aKeys.length == bKeys.length) {
          for (let key of aKeys) {
            if (!(key in _specials)) {
              if (!eq(aDict[key], bDict[key])) {
                return false;
              }
            }
          }
          return true;
        }
      }

      // TODO: Intern funcs so we don't have to engage in this mess?
      let aFunc = isFunc(a), bFunc = isFunc(b);
      if (aFunc && bFunc) {
        return eq(funcExpr(aFunc), funcExpr(bFunc)) &&
          eq(funcParams(aFunc), funcParams(bFunc)) &&
            funcScope(aFunc) === funcScope(bFunc); // We can't do deep equality on the scope; it will cycle.
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
export function chuck(scope: Scope, msg: string) {
  debugger;
  throw {
    msg: msg,
    stack: _printStack(scope),
  };
}

export function isQuote(val: EExpr): EQuote {
  if (val && typeof val == 'object' && (QuoteMarker in val)) {
    return val as EQuote;
  }
  return nil;
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

export function isDict(val: EExpr): EDict {
  if (val && typeof val == 'object' && val.constructor == Object && !isSym(val) && !isFunc(val)) {
    return val as EDict;
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
  return sym._expr_sym;
}

export function opaque(val: any): EOpaque {
  return { _expr_opaque: val };
}

export function isOpaque(val: EExpr): EOpaque {
  if (val && (typeof val == "object") && OpaqueMarker in (val as any)) {
    return val as EOpaque;
  }
  return nil;
}

export function opaqueVal(val: EOpaque): any {
  return val._expr_opaque;
}

export function isFunc(val: EExpr): EFunc {
  if (val && (typeof val == "object") && FuncMarker in (val as any)) {
    return val as EFunc;
  }
  return nil;
}

export function funcParams(func: EFunc): EList {
  return isList(func._expr_func[0]);
}

export function funcExpr(func: EFunc): EExpr {
  return func._expr_func[1];
}

export function funcScope(func: EFunc): Scope {
  return func._expr_scope;
}

export function funcName(func: EFunc): string {
  return func._expr_name || "";
}

export function funcSelf(func: EFunc): EDict {
  return func._expr_self;
}
