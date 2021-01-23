import { _apply, _eval } from "./eval";
import { _print } from "./print";
import { Dict, dictRef, _root } from "./dict";
import { chuck, $, isList, EExpr, _blk, _, isBlock, _def, _do, nil, eq } from "./script";
import { expectNum, locNum } from "./scope";

export const _debug = $('debug');
export const _and = $('and');
export const _if = $('if');
export const _forEach = $('for-each');
export const _log = $('log');
export const _add = $('+');
export const _gt = $('>');
export const _lt = $('<');
export const _gte = $('>=');
export const _lte = $('<=');
export const _eq = $('=');
export const __eval = $('eval');
export const _list = $('list');

export let builtinDefs = [_def, {
  'debug': [_blk, (scope: Dict) => {
    debugger;
    return nil;
  }],

  'eval': [$('expr'), _blk, (scope: Dict) => {
    return _eval(scope, dictRef(scope, $('expr')));
  }],

  'list': [$('...elems'), _blk, (scope: Dict) => {
    let elemsExpr = dictRef(scope, $('elems'));
    let elems = isList(elemsExpr);
    if (!elems) {
      chuck(scope, `expected list; got ${_print(elemsExpr)}`);
    }
    return elems;
  }],

  // TODO: Use rest params once implemented.
  'and': [$('...vals'), _blk, (scope: Dict) => {
    let valsExpr = dictRef(scope, $('vals'));
    let vals = isList(valsExpr);
    if (!vals) {
      chuck(scope, `expected list; got ${_print(valsExpr)}`);
    }
    for (let val of vals) {
      let block = isBlock(val);
      if (block !== nil) {
        val = _apply(scope, [{}, block]);
      }
      if (typeof val != 'boolean') {
        chuck(scope, `${val} must be boolean; got ${_print(val)}`);
      }
      if (!val) {
        return false;
      }
    }
    return true;
  }],

  'if': [$('expr'), $('then'), $('else'), _blk, (scope: Dict) => {
    // if:
    let b = dictRef(scope, $('expr'));
    if (typeof b != 'boolean') {
      chuck(scope, `${b} must be boolean`);
    }

    if (b) {
      // then:
      let then = dictRef(scope, $('then'));
      return _eval(scope, [{}, then]);
    } else {
      // else:
      let els = dictRef(scope, $('else'));
      if (els !== nil) {
        return _eval(scope, [{}, els]);
      }
    }
    return nil;
  }],

  'for-each': [$('list'), $('expr'), _blk, (scope: Dict) => {
    let list = isList(dictRef(scope, $('list')));
    let expr = dictRef(scope, $('expr'))
    for (let item of list) {
      _apply(scope, [expr, item]);
    }
    return nil;
  }],

  'log': [$('msg'), _blk, (scope: Dict) => {
    let msg = dictRef(scope, $('msg'));
    console.log(_print(msg));
    return nil;
  }],

  '+': [$('...vals'), _blk, (scope: Dict) => {
    let valsExpr = dictRef(scope, $('vals'));
    let vals = isList(valsExpr);
    if (!vals) {
      chuck(scope, `expected list; got ${_print(valsExpr)}`);
    }
    let result = 0;
    for (let val of vals) {
      result += expectNum(scope, val);
    }
    return result;
  }],

  '>': [$('x'), $('y'), _blk, (scope: Dict) => {
    return locNum(scope, $('x')) > locNum(scope, $('y'));
  }],

  '<': [$('x'), $('y'), _blk, (scope: Dict) => {
    return locNum(scope, $('x')) < locNum(scope, $('y'));
  }],

  '>=': [$('x'), $('y'), _blk, (scope: Dict) => {
    return locNum(scope, $('x')) >= locNum(scope, $('y'));
  }],

  '<=': [$('x'), $('y'), _blk, (scope: Dict) => {
    return locNum(scope, $('x')) <= locNum(scope, $('y'));
  }],

  '=': [$('a'), $('b'), _blk, (scope: Dict) => {
    let a = dictRef(scope, $('a'));
    let b = dictRef(scope, $('b'));
    return eq(a, b);
  }]
}];
