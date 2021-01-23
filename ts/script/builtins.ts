import { evalListElems, _apply, _eval } from "./eval";
import { _print } from "./print";
import { expectNum, locNum, Scope, scopeRef, _root } from "./scope";
import { chuck, $, isList, EExpr, _blk, _, isBlock, _def, _do, nil, eq } from "./script";

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
  'debug': [_blk, (scope: Scope) => {
    debugger;
    return nil;
  }],

  'eval': [$('expr'), _blk, (scope: Scope) => {
    return _eval(scope, scopeRef(scope, $('expr')));
  }],

  'list': [$('...elems'), _blk, (scope: Scope) => {
    let elemsExpr = scopeRef(scope, $('elems'));
    let elems = isList(elemsExpr);
    if (!elems) {
      chuck(scope, `expected list; got ${_print(elemsExpr)}`);
    }
    return elems;
  }],

  // TODO: Use rest params once implemented.
  'and': [$('...vals'), _blk, (scope: Scope) => {
    let valsExpr = scopeRef(scope, $('vals'));
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

  'if': [$('expr'), $('then'), $('else'), _blk, (scope: Scope) => {
    // if:
    let b = scopeRef(scope, $('expr'));
    if (typeof b != 'boolean') {
      chuck(scope, `${b} must be boolean`);
    }

    // TODO: This apply/eval switch is really gross. Maybe just require blocks for then/else params?
    if (b) {
      // then:
      let then = scopeRef(scope, $('then'));
      let block = isBlock(then);
      if (block) {
        return _apply(scope, [{}, block]);
      }
      return _eval(scope, then);
    } else {
      // else:
      let els = scopeRef(scope, $('else'));
      if (els !== nil) {
        let block = isBlock(els);
        if (block) {
          return _apply(scope, [{}, block]);
        }
        return _eval(scope, els);
      }
    }

    return nil;
  }],

  'for-each': [$('list'), $('expr'), _blk, (scope: Scope) => {
    let list = isList(scopeRef(scope, $('list')));
    let expr = scopeRef(scope, $('expr'))
    for (let item of list) {
      _apply(scope, [expr, item]);
    }
    return nil;
  }],

  'log': [$('msg'), _blk, (scope: Scope) => {
    let msg = scopeRef(scope, $('msg'));
    console.log(_print(msg));
    return nil;
  }],

  '+': [$('...vals'), _blk, (scope: Scope) => {
    let valsExpr = scopeRef(scope, $('vals'));
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

  '>': [$('x'), $('y'), _blk, (scope: Scope) => {
    return locNum(scope, $('x')) > locNum(scope, $('y'));
  }],

  '<': [$('x'), $('y'), _blk, (scope: Scope) => {
    return locNum(scope, $('x')) < locNum(scope, $('y'));
  }],

  '>=': [$('x'), $('y'), _blk, (scope: Scope) => {
    return locNum(scope, $('x')) >= locNum(scope, $('y'));
  }],

  '<=': [$('x'), $('y'), _blk, (scope: Scope) => {
    return locNum(scope, $('x')) <= locNum(scope, $('y'));
  }],

  '=': [$('a'), $('b'), _blk, (scope: Scope) => {
    let a = scopeRef(scope, $('a'));
    let b = scopeRef(scope, $('b'));
    return eq(a, b);
  }]
}];
