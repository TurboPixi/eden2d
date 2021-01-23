import { evalListElems, _apply, _eval } from "./eval";
import { _print } from "./print";
import { expectNum, locNum, Scope, scopeRef, _root } from "./scope";
import { chuck, $, isList, EExpr, _blk, _, isFunc, _def, _do, nil, eq } from "./script";

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

  'eval': [$('expr'), _blk, function (scope: Scope): EExpr {
    return _eval(scope, scopeRef(scope, $('expr')));
  }],

  'list': [$('...elems'), _blk, function (scope: Scope): EExpr {
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
      let func = isFunc(val);
      if (func !== nil) {
        val = _apply(scope, [{}, func]);
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

  'if': [$('expr'), $('then'), $('else'), _blk, function (scope: Scope): EExpr {
    // if:
    let b = scopeRef(scope, $('expr'));
    if (typeof b != 'boolean') {
      chuck(scope, `${b} must be boolean`);
    }

    // TODO: This apply/eval switch is really gross. Maybe just require funcs for then/else params?
    if (b) {
      // then:
      let then = scopeRef(scope, $('then'));
      let func = isFunc(then);
      if (func) {
        return _apply(scope, [{}, func]);
      }
      return _eval(scope, then);
    } else {
      // else:
      let els = scopeRef(scope, $('else'));
      if (els !== nil) {
        let func = isFunc(els);
        if (func) {
          return _apply(scope, [{}, func]);
        }
        return _eval(scope, els);
      }
    }

    return nil;
  }],

  'for-each': [$('list'), $('expr'), _blk, function (scope: Scope): EExpr {
    let list = isList(scopeRef(scope, $('list')));
    let expr = scopeRef(scope, $('expr'))
    for (let item of list) {
      _apply(scope, [expr, item]);
    }
    return nil;
  }],

  'log': [$('msg'), _blk, function (scope: Scope): EExpr {
    let msg = scopeRef(scope, $('msg'));
    console.log(_print(msg));
    return undefined;
  }],

  '+': [$('...vals'), _blk, function (scope: Scope): EExpr {
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

  '>': [$('x'), $('y'), _blk, function (scope: Scope): EExpr {
    return locNum(scope, $('x')) > locNum(scope, $('y'));
  }],

  '<': [$('x'), $('y'), _blk, function (scope: Scope): EExpr {
    return locNum(scope, $('x')) < locNum(scope, $('y'));
  }],

  '>=': [$('x'), $('y'), _blk, function (scope: Scope): EExpr {
    return locNum(scope, $('x')) >= locNum(scope, $('y'));
  }],

  '<=': [$('x'), $('y'), _blk, function (scope: Scope): EExpr {
    return locNum(scope, $('x')) <= locNum(scope, $('y'));
  }],

  '=': [$('a'), $('b'), _blk, function (scope: Scope): EExpr {
    let a = scopeRef(scope, $('a'));
    let b = scopeRef(scope, $('b'));
    return eq(a, b);
  }]
}];
