import { _apply, _eval } from "./eval";
import { _print } from "./print";
import { locNum, Scope, scopeRef, _root } from "./scope";
import { chuck, $, isList, EExpr, _blk, _, isFunc, _def, _do, nil, eq } from "./script";

export const _debug = $('debug');
export const _if = $('if');
export const _forEach = $('for-each');
export const _log = $('log');
export const _add = $('+');
export const _gt = $('>');
export const _eq = $('=');
export const __eval = $('eval');

export function evalBuiltins() {
  _eval(_root, [_do,
    [_def, _(_debug),
      [_blk, (scope: Scope) => {
        debugger;
        return nil;
      }]
    ],

    [_def, _(__eval),
      [$('expr'), _blk, function (scope: Scope): EExpr {
        return _eval(scope, scopeRef(scope, $('expr')));
      }]
    ],

    [_def, _(_if),
      [$('expr'), $('then'), $('else'), _blk, function (scope: Scope): EExpr {
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
      }]
    ],

    [_def, _(_forEach),
      [$('list'), $('expr'), _blk, function (scope: Scope): EExpr {
        let list = isList(scopeRef(scope, $('list')));
        let expr = scopeRef(scope, $('expr'))
        for (let item of list) {
          _apply(scope, [expr, item]);
        }
        return nil;
      }]
    ],

    [_def, _(_log),
      [$('msg'), _blk, function (scope: Scope): EExpr {
        let msg = scopeRef(scope, $('msg'));
        console.log(_print(msg));
        return undefined;
      }]
    ],

    [_def, _(_add),
      [$('x'), $('y'), _blk, function (scope: Scope): EExpr {
        return locNum(scope, $('x')) + locNum(scope, $('y'));
      }]
    ],

    [_def, _(_gt),
      [$('x'), $('y'), _blk, function (scope: Scope): EExpr {
        return locNum(scope, $('x')) > locNum(scope, $('y'));
      }]
    ],

    [_def, _(_eq),
      [$('a'), $('b'), _blk, function (scope: Scope): EExpr {
        let a = scopeRef(scope, $('a'));
        let b = scopeRef(scope, $('b'));
        return eq(a, b);
      }]
    ]
  ]);
}
