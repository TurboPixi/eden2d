import { _apply, _eval } from "./eval";
import { _print } from "./print";
import { Dict, dictNames, dictRef, isDict, _root } from "./dict";
import { chuck, $, isList, _blk, _, isBlock, _def, _do, nil, eq } from "./script";
import { expectNum, locBool, locNum } from "./env";

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
export const _not = $('!');
export const __eval = $('eval');
export const _list = $('list');

export let builtinDefs = [_def, {
  'debug': [_blk, (env: Dict) => {
    debugger;
    return nil;
  }],

  'eval': [$('expr'), _blk, (env: Dict) => {
    return _eval(env, dictRef(env, $('expr')));
  }],

  'list': [$('...elems'), _blk, (env: Dict) => {
    let elemsExpr = dictRef(env, $('elems'));
    let elems = isList(elemsExpr);
    if (!elems) {
      chuck(env, `expected list; got ${_print(elemsExpr)}`);
    }
    return elems;
  }],

  // TODO: Use rest params once implemented.
  'and': [$('...vals'), _blk, (env: Dict) => {
    let valsExpr = dictRef(env, $('vals'));
    let vals = isList(valsExpr);
    if (!vals) {
      chuck(env, `expected list; got ${_print(valsExpr)}`);
    }
    for (let val of vals) {
      let block = isBlock(val);
      if (block !== nil) {
        val = _apply(env, [{}, block]);
      }
      if (typeof val != 'boolean') {
        chuck(env, `${val} must be boolean; got ${_print(val)}`);
      }
      if (!val) {
        return false;
      }
    }
    return true;
  }],

  'if': [$('expr'), $('then'), $('else'), _blk, (env: Dict) => {
    // if:
    let b = dictRef(env, $('expr'));
    if (typeof b != 'boolean') {
      chuck(env, `${b} must be boolean`);
    }

    if (b) {
      // then:
      let then = dictRef(env, $('then'));
      return _eval(env, [{}, then]);
    } else {
      // else:
      let els = dictRef(env, $('else'));
      if (els !== nil) {
        return _eval(env, [{}, els]);
      }
    }
    return nil;
  }],

  'for-each': [$('list'), $('expr'), _blk, (env: Dict) => {
    let list = isList(dictRef(env, $('list')));
    let expr = dictRef(env, $('expr'))
    for (let item of list) {
      _apply(env, [expr, item]);
    }
    return nil;
  }],

  'for-each-entry': [$('dict'), $('expr'), _blk, (env: Dict) => {
    let dict = isDict(dictRef(env, $('dict')));
    let expr = dictRef(env, $('expr'))
    for (let name of dictNames(dict)) {
      let sym = $(name);
      _apply(env, [expr, _(sym), dictRef(dict, sym)]);
    }
    return nil;
  }],

  'log': [$('msg'), _blk, (env: Dict) => {
    let msg = dictRef(env, $('msg'));
    console.log(_print(msg));
    return nil;
  }],

  '+': [$('...vals'), _blk, (env: Dict) => {
    let valsExpr = dictRef(env, $('vals'));
    let vals = isList(valsExpr);
    if (!vals) {
      chuck(env, `expected list; got ${_print(valsExpr)}`);
    }
    let result = 0;
    for (let val of vals) {
      result += expectNum(env, val);
    }
    return result;
  }],

  '>': [$('x'), $('y'), _blk, (env: Dict) => {
    return locNum(env, $('x')) > locNum(env, $('y'));
  }],

  '<': [$('x'), $('y'), _blk, (env: Dict) => {
    return locNum(env, $('x')) < locNum(env, $('y'));
  }],

  '>=': [$('x'), $('y'), _blk, (env: Dict) => {
    return locNum(env, $('x')) >= locNum(env, $('y'));
  }],

  '<=': [$('x'), $('y'), _blk, (env: Dict) => {
    return locNum(env, $('x')) <= locNum(env, $('y'));
  }],

  '=': [$('a'), $('b'), _blk, (env: Dict) => {
    let a = dictRef(env, $('a'));
    let b = dictRef(env, $('b'));
    return eq(a, b);
  }],

  '!': [$('x'), _blk, (env: Dict) => {
    return !locBool(env, $('x'));
  }],
}];
