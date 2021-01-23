import { _print } from "./print";
import { Dict, dictDef, dictFind, dictNames, dictRef, _root, _specials, translateSym, isDict, isEDict } from "./dict";
import { chuck, EExpr, EList, ESym, isList, isQuote, isSym, NativeBlock, nil, $, _, symName, __, isBlock, blockExpr, blockParams, blockScope, EDict, blockSelf, _self, _parentTag, _parentTagName, ScopeMarker, BlockMarker, QuoteMarker, blockName } from "./script";
import { lookupSym, scopeNew } from "./scope";

const ScriptError = 'script error';

// Internal evaluate implementation, that doesn't catch or log exceptions.
export function _eval(scope: Dict, expr: EExpr): EExpr {
  switch (typeof expr) {
    case 'number':
    case 'boolean':
    case 'string':
      // Primitive value.
      return expr;

    case 'undefined':
      return nil;

    case 'function':
      // Call native impl.
      let fn = expr as NativeBlock;
      return fn(scope);

    case 'object':
      if (expr === null) {
        return nil;
      }

      // :thing is a literal expression, not evaluated.
      let quote = isQuote(expr);
      if (quote) {
        return quote[QuoteMarker];
      }

      // [f[x] [...]] evaluates to itself.
      let block = isBlock(expr);
      if (block) {
        return block;
      }

      // foo ({[sym]: 'foo'} at runtime) is an identifier.
      let sym = isSym(expr);
      if (sym) {
        let result = lookupSym(scope, sym);
        if (result === nil) {
          chuck(scope, 'unbound identifier ' + symName(expr as ESym));
        }
        return result;
      }

      // [a b c ...] is a list.
      // Treat it as function application.
      let list = isList(expr);
      if (list) {
        return _apply(scope, list);
      }

      // {foo:a bar:b ...} is a dict.
      // TODO: Consider whether to make it possible to eval dict keys (weird in js, but useful in general).
      let edict = isEDict(expr);
      if (edict) {
        return evalDict(scope, edict);
      }

      // Native dict.
      let dict = isDict(expr);
      if (dict) {
        return dict;
      }

    // No idea what this is. Fall through.
  }

  // TODO: Which cases actually end up here?
  console.log("something funky this way comes", _print(expr));
  return expr;
}

function evalDict(scope: Dict, dict: EDict): EDict {
  // Copy the dict to a new expression, so we're not mutating the original.
  let result = {} as EDict;
  for (let key in dict) {
    if (key in _specials) {
      // Specials are copied, not eval'd.
      result[key] = dict[key];
    } else {
      let sym = translateSym($(key));
      let val = dict[key];
      result[symName(sym)] = _eval(scope, val);
    }
  }

  // Dicts without an explicit parent automatically get the current scope.
  if (!(_parentTagName in result)) {
    result[_parentTagName] = scope;
  }
  return result;
}

function assertNoExtra(scope: Dict, list: EList, expected: number) {
  if (list.length > expected) {
    chuck(scope, `expected ${expected} list items; got ${list.length}\n${_print(list)}`);
  }
}

export function _apply(scope: Dict, list: EList): EExpr {
  // Special forms.
  let [result, found] = applySpecial(scope, list);
  if (found) {
    return result;
  }

  // [arg-scope expr] => expr
  // TODO: [{scope} expr expr*] for mixed scope + positional args
  let elem0 = _eval(scope, list[0]);
  let argScope = isDict(elem0);
  if (argScope && list.length > 1) {
    assertNoExtra(scope, list, 2);

    let expr = _eval(argScope, list[1]);
    let exprSym = isSym(expr);
    if (exprSym) {
      // For the [{scope}:sym] case, short-circuit all the logic below.
      return maybeWrapBlock(argScope, expr, _eval(argScope, exprSym));
    } else {
      // Explicit env argument override.
      let overrideEnv = isDict(dictRef(argScope, $('env')));

      // If expr is a function, unwrap it.
      // [scope block] => [new-scope block-expr]
      let block = isBlock(expr);
      let exprEnv: Dict;
      if (block) {
        // Functions have an attached default environment.
        exprEnv = blockScope(block);
        expr = blockExpr(block);
        // TODO: Validate params?
      } else {
        // Expressions take their default environment from the arg scope.
        exprEnv = argScope;
      }

      let env = overrideEnv ? overrideEnv : exprEnv;

      // Create a new frame and eval the expression within it.
      let frame = scopeNew(env, scope, blockName(block));
      for (let name of dictNames(argScope)) {
        let sym = $(name);
        dictDef(frame, sym, dictRef(argScope, sym));
      }

      // Add block's self to frame if specified.
      if (block) {
        let self = blockSelf(block);
        if (self) {
          dictDef(frame, _self, self);
        }
      }
      return maybeWrapBlock(argScope, expr, _eval(frame, expr));
    }
  }

  // Transform application of positional arguments to block.
  // [block expr*] => [scope :block]
  let block = isBlock(elem0);
  if (block) {
    let params = blockParams(block);
    let frame = scopeNew(scope, scope, blockName(block));
    let args = list.slice(1)

    let consumedAll = false;
    for (let i = 0; i < params.length; i++) {
      // Don't eval args; they'll get evaluated after the scope transform.
      let sym = isSym(params[i]);
      if (!sym) {
        chuck(scope, `expected sym at param ${i}, but got ${params[i]}`);
      }
      if (isRestParam(sym)) {
        // A ...rest param consumes all remaining arguments as a list.
        // They need to be eval'd in place, because the subsequent application won't do so.
        sym = $(symName(sym).slice(3)); // Remove the ...
        dictDef(frame, sym, _(evalListElems(scope, args.slice(i))));
        consumedAll = true;
      } else {
        // Normal argument.
        dictDef(frame, sym, args[i]);
      }
    }
    if (!consumedAll) {
      assertNoExtra(scope, list, params.length + 1);
    }

    return _eval(scope, [frame, block]);
  }

  // [expr]
  assertNoExtra(scope, list, 1);
  return elem0;
}

export function evalListElems(scope: Dict, list: EList): EList {
  let result: EList = [];
  for (var i = 0; i < list.length; i++) {
    result[i] = _eval(scope, list[i]);
  }
  return result;
}

function maybeWrapBlock(scope: Dict, expr: EExpr, result: EExpr): EExpr {
  let rblock = isBlock(result);
  let blockSym = isSym(expr);
  if (rblock && blockSym) {
    return {
      '[scope]': rblock[ScopeMarker],
      '[block]': rblock[BlockMarker],
      '[name]': symName(blockSym),
      '[self]': scope,
    };
  }
  return result;
}

function applySpecial(scope: Dict, list: EList): [EExpr, boolean] {
  let sym = isSym(list[0]);
  if (sym) {
    switch (symName(sym)) {
      case 'do':
        return [applyDo(scope, list), true];
      case 'def':
        return [applyDef(scope, list), true];
      case 'set':
        return [applySet(scope, list), true];
      case '?':
        return [applyExists(scope, list), true];
    }
  }

  // Special case -- look for [sym*|expr+] that designates a function.
  // TODO: Handle function scope override option in the syntax.
  let params: ESym[] = [];
  for (let i = 0; i < list.length; i++) {
    let sym = isSym(list[i]);
    if (!sym) {
      break;
    }

    if (symName(sym) == '|') {
      let expr: EExpr = list.slice(i + 1);
      if (expr.length == 1 && typeof expr[0] == 'function') {
        // Special case -- make sure [native] gets unwrapped.
        expr = expr[0];
      }
      return [{
        '[block]': [params, expr],
        '[scope]': scope
      }, true];
    }
    params.push(sym);
  }

  return [nil, false];
}

function applyDo(scope: Dict, list: EList): EExpr {
  let last: EExpr;
  for (let i = 1; i < list.length; i++) {
    last = _eval(scope, list[i]);
  }
  return last;
}

function applyDef(scope: Dict, list: EList): EExpr {
  let target = scope;
  let values: EDict;
  switch (list.length) {
    case 2:
      values = isEDict(_eval(scope, list[1]));
      break;
    case 3:
      target = isDict(_eval(scope, list[1]))
      values = isEDict(_eval(scope, list[2]));
      break;
    default:
      chuck(scope, `expected either 1 or 2 args for def, but got ${_print(list)}`);
  }

  if (target === nil) {
    chuck(scope, `no scope found at ${_print(list[1])}`);
  }

  if (values === nil) {
    chuck(scope, `expected dict definition at ${_print(list[2])}`);
  }

  for (let name in values) {
    if (!(name in _specials)) {
      dictDef(target, $(name), values[name]);
    }
  }
  return nil;
}

function applySet(scope: Dict, list: EList): EExpr {
  switch (list.length) {
    case 2: {
      // If scope is unspecified, set the value at the nearest scope where it's defined.
      let values = isEDict(_eval(scope, list[1]));
      if (values === nil) {
        chuck(scope, `single argument to set must be dict`);
      }
      for (let name in values) {
        if (!(name in _specials)) {
          let target = dictFind(scope, $(name));
          if (!target) {
            chuck(scope, `${name} undefined`);
          }
          dictDef(target, $(name), _eval(scope, values[name]));
        }
      }
      break;
    }

    case 3: {
      // When scope is explicitly specified, set the value directly at that scope.
      let ctx = isDict(_eval(scope, list[1]));
      if (!ctx) {
        chuck(scope, `first of two set args must be a scope`);
      }
      let values = isEDict(_eval(scope, list[2]));
      if (values === nil) {
        chuck(scope, `second of two set args must be dict`);
      }
      for (let name in values) {
        if (!(name in _specials)) {
          let value = _eval(scope, values[name]);
          dictDef(ctx, $(name), value);
        }
      }
      break;
    }

    default:
      chuck(scope, `expected either 1 or 2 args for set, but got ${_print(list)}`);
  }
  return nil;
}

function applyExists(scope: Dict, list: EList): EExpr {
  let arg0 = _eval(scope, list[1]);
  let arg1 = _eval(scope, list[2]);

  let sym: ESym;
  let ctx = isDict(arg0) as Dict;
  if (ctx) {
    sym = isSym(arg1);
  } else {
    ctx = scope;
    sym = isSym(arg0);
  }

  return !!dictFind(ctx, sym);
}

function isRestParam(sym: ESym): boolean {
  return symName(sym).startsWith("...");
}
