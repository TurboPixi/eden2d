import { _print } from "./print";
import { Dict, dictDef, dictFind, dictNames, dictRef, _root, _specialProps, isDict, isEDict, translateSym, dictParent } from "./dict";
import { chuck, EExpr, EList, ESym, isList, isQuote, isSym, NativeBlock, nil, $, _, symName, __, isBlock, blockExpr, blockParams, blockEnv, EDict, blockSelf, _self, _parentTag, _parentTagName, EnvMarker, BlockMarker, QuoteMarker, blockName, EBlock, isOpaque, isFullQuote } from "./script";
import { envNew, TeeEnv } from "./env";

// Internal evaluate implementation, that doesn't catch or log exceptions.
export function _eval(env: Dict, expr: EExpr): EExpr {
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
      return fn(env);

    case 'object':
      if (expr === null) {
        return nil;
      }

      // :thing is a literal expression, not evaluated.
      let quote = isQuote(expr);
      if (quote) {
        return quote[QuoteMarker];
      }

      // \thing is fully quoted, and evals to itself.
      let fquote = isFullQuote(expr);
      if (fquote) {
        return fquote;
      }

      // [f[x] [...]] evaluates to itself.
      let block = isBlock(expr);
      if (block) {
        return block;
      }

      // foo ({[sym]: 'foo'} at runtime) is an identifier.
      let sym = isSym(expr);
      if (sym) {
        if (symName(sym) == 'env') {
          return env;
        }

        let target = dictFind(env, sym);
        if (target === nil) {
          chuck(env, 'unbound identifier ' + symName(expr as ESym));
        }
        return dictRef(target, sym);
      }

      let opaque = isOpaque(expr);
      if (opaque) {
        // Leave opaque values alone.
        return opaque;
      }

      // [a b c ...] is a list.
      // Treat it as function application.
      let list = isList(expr);
      if (list) {
        return _apply(env, list);
      }

      // {foo:a bar:b ...} is a dict.
      // TODO: Consider whether to make it possible to eval dict keys (weird in js, but useful in general).
      let edict = isEDict(expr);
      if (edict) {
        // Copy the dict to a new expression, so we're not mutating the original.
        let result = {} as EDict;
        let dictEnv = new TeeEnv(result, env);
        for (let key in edict) {
          if (key in _specialProps) {
            // Specials are copied, not eval'd.
            result[key] = edict[key];
          } else {
            dictDef(result, $(key), _eval(dictEnv, edict[key]));
          }
        }
        return result;
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

export function _apply(env: Dict, _expr: EList): EExpr {
  // Copy so we can see expr in the debugger after modification.
  let list = _expr;

  // Special forms.
  let [result, found] = applySpecial(env, list);
  if (found) {
    return result;
  }

  let elem0 = _eval(env, list[0]);

  // Transform application of positional arguments to block.
  // TODO: [{env} expr expr*] for mixed env + positional args
  let block = isBlock(elem0);
  if (block) {
    // [block expr*] => [env :block]
    let frame = rewriteArgs(env, block, list.slice(1));
    list = [frame, block];
    elem0 = _eval(env, list[0]);
  }

  // Evaluate the expression in the context of the given environment.
  let argEnv = isDict(elem0);
  if (argEnv && list.length == 2) {
    // [arg-env expr] => expr
    let overrideEnv = isDict(dictParent(argEnv));
    if (dictRef(argEnv, _parentTag) === nil) {
      argEnv = new TeeEnv(argEnv, env);
    }

    let expr = _eval(argEnv, list[1]);
    let exprSym = isSym(expr);
    if (exprSym) {
      // For the [{env}:sym] case, short-circuit all the logic below.
      return maybeWrapBlock(argEnv, expr, _eval(argEnv, exprSym));
    } else {
      // If expr is a function, unwrap it.
      // [env block] => [new-env block-expr]
      let block = isBlock(expr);
      let exprEnv: Dict;
      if (block) {
        // Functions have an attached default environment.
        exprEnv = blockEnv(block);
        expr = blockExpr(block);
        // TODO: Validate params?
      } else {
        // Expressions take their default environment from the arg env.
        exprEnv = argEnv;
      }

      // Explicit env argument override.
      if (overrideEnv) {
        exprEnv = overrideEnv;
        if (dictRef(exprEnv, _parentTag) === nil) {
          exprEnv = new TeeEnv(exprEnv, env);
        }
      }

      // Create a new frame and eval the expression within it.
      let frame = envNew(exprEnv, env, blockName(block));
      for (let name of dictNames(argEnv)) {
        let sym = $(name);
        dictDef(frame, sym, dictRef(argEnv, sym));
      }

      // Add block's self to frame if specified.
      if (block) {
        let self = blockSelf(block);
        if (self) {
          dictDef(frame, _self, self);
        }
      }
      return maybeWrapBlock(argEnv, expr, _eval(frame, expr));
    }
  }

  let arr = isList(elem0);
  if (arr && list.length == 2) {
    let acc = _eval(env, list[1]);
    let accSym = isSym(acc);
    if (accSym) {
      let idx = parseInt(symName(accSym));
      if (isNaN(idx)) {
        chuck(env, `expected list index; got ${_print(acc)}`);
      }
      return arr[idx];
    } else if (typeof acc == 'number') {
      return arr[acc];
    }
  }

  // [expr]
  assertNoExtra(env, list, 1);
  return elem0;
}

function rewriteArgs(env: Dict, block: EBlock, args: EList): Dict {
  let params = blockParams(block);
  let frame = envNew(nil, env, blockName(block));

  let consumedAll = false;
  for (let i = 0; i < params.length; i++) {
    // Don't eval args; they'll get evaluated after the env transform.
    let sym = isSym(params[i]);
    if (!sym) {
      chuck(env, `expected sym at param ${i}, but got ${params[i]}`);
    }
    if (isRestParam(sym)) {
      // A ...rest param consumes all remaining arguments as a list.
      // They need to be eval'd in place, because the subsequent application won't do so.
      sym = $(symName(sym).slice(3)); // Remove the ...
      dictDef(frame, sym, _(evalListElems(env, args.slice(i))));
      consumedAll = true;
    } else if (i < args.length) {
      // Normal argument.
      dictDef(frame, sym, args[i]);
    }
  }
  if (!consumedAll) {
    assertNoExtra(env, args, params.length);
  }
  return frame;
}

function evalListElems(env: Dict, list: EList): EList {
  let result: EList = [];
  for (var i = 0; i < list.length; i++) {
    result[i] = _eval(env, list[i]);
  }
  return result;
}

function assertNoExtra(env: Dict, list: EList, expected: number) {
  if (list.length > expected) {
    chuck(env, `expected ${expected} list items; got ${list.length}\n${_print(list)}`);
  }
}

function maybeWrapBlock(env: Dict, expr: EExpr, result: EExpr): EExpr {
  let rblock = isBlock(result);
  let blockSym = isSym(expr);
  if (rblock && blockSym) {
    return {
      '[env]': rblock[EnvMarker],
      '[block]': rblock[BlockMarker],
      '[name]': symName(blockSym),
      '[self]': env,
    };
  }
  return result;
}

function applySpecial(env: Dict, list: EList): [EExpr, boolean] {
  let sym = isSym(list[0]);
  if (sym) {
    switch (symName(sym)) {
      case 'do':
        return [applyDo(env, list), true];
      case 'def':
        return [applyDef(env, list), true];
      case 'set':
        return [applySet(env, list), true];
      case '?':
        return [applyExists(env, list), true];
      case '!?':
        return [!applyExists(env, list), true];
    }
  }

  // Special case -- look for [sym*|expr+] that designates a function.
  // TODO: Handle block env override option in the syntax.
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
        '[env]': env
      }, true];
    }
    params.push(sym);
  }

  return [nil, false];
}

function applyDo(env: Dict, list: EList): EExpr {
  let last: EExpr;
  for (let i = 1; i < list.length; i++) {
    last = _eval(env, list[i]);
  }
  return last;
}

// TODO: def/set are broken if you use an IDict for the values dict.
function applyDef(env: Dict, list: EList): EExpr {
  let target = env;
  let values: Dict;
  switch (list.length) {
    case 2:
      values = isDict(_eval(env, list[1]));
      break;
    case 3:
      target = isDict(_eval(env, list[1]));
      values = isDict(_eval(env, list[2]));
      break;
    case 4:
      target = isDict(_eval(env, list[1]));
      let sym = isSym(_eval(env, list[2]));
      if (sym === nil) {
        chuck(env, `expected a symbol key`);
      }
      values = {};
      values[symName(sym)] = _eval(env, list[3]);
      break;
    default:
      chuck(env, `expected either 1 or 2 args for def, but got ${_print(list)}`);
  }

  if (target === nil) {
    chuck(env, `no env found at ${_print(list[1])}`);
  }
  if (values === nil) {
    chuck(env, `expected dict definition at ${_print(list[2])}`);
  }

  for (let name in values) {
    dictDef(target, translateSym($(name)), dictRef(values, $(name)));
  }
  return nil;
}

function applySet(env: Dict, list: EList): EExpr {
  // TODO: Make it possible to [set target sym-holding-dict], like it is for [def] above.
  switch (list.length) {
    case 2: {
      // If env is unspecified, set the value at the nearest env where it's defined.
      let values = isDict(_eval(env, list[1]));
      if (values === nil) {
        chuck(env, `single argument to set must be dict`);
      }
      for (let name in values) {
        let target = dictFind(env, $(name));
        if (!target) {
          chuck(env, `${name} undefined`);
        }
        dictDef(target, translateSym($(name)), dictRef(values, $(name)));
      }
      break;
    }

    case 3: {
      // When env is explicitly specified, set the value directly in that env.
      let ctx = isDict(_eval(env, list[1]));
      if (!ctx) {
        chuck(env, `first of two set args must be a dict`);
      }
      let values = isDict(_eval(env, list[2]));
      if (values === nil) {
        chuck(env, `second of two set args must be dict`);
      }
      for (let name in values) {
        dictDef(ctx, translateSym($(name)), dictRef(values, $(name)));
      }
      break;
    }

    case 4: {
      let ctx = isDict(_eval(env, list[1]));
      if (!ctx) {
        chuck(env, `first of two set args must be a dict`);
      }
      let name = isSym(_eval(env, list[2]));
      if (name === nil) {
        chuck(env, `expected a symbol key`);
      }
      let value = list[3];
      dictDef(ctx, translateSym(name), _eval(env, value));
      break;
    }

    default:
      chuck(env, `expected either 1 or 2 args for set, but got ${_print(list)}`);
  }
  return nil;
}

function applyExists(env: Dict, list: EList): EExpr {
  let ctx: Dict;
  let sym: ESym;
  switch (list.length) {
    case 2:
      ctx = env;
      sym = isSym(_eval(env, list[1]));
      break;
    case 3:
      ctx = isDict(_eval(env, list[1]));
      sym = isSym(_eval(env, list[2]));
      break;
    default:
      chuck(env, `? requires 1 or two arguments; got ${list.length - 1}`);
  }

  if (ctx === nil) {
    return false;
  }
  return !!dictFind(ctx, sym);
}

function isRestParam(sym: ESym): boolean {
  return symName(sym).startsWith("...");
}
