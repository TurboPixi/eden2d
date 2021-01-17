import { _print } from "./print";
import { lookupSym, isScope, Scope, scopeDef, scopeFind, scopeNames, scopeNew, scopeParent, scopeRef, _root, _specials } from "./scope";
import { chuck, EExpr, EList, ESym, isDict, isList, isQuote, isSym, NativeFunc, nil, $, _, symName, EFunc, __, isFunc, funcExpr, funcParams, funcScope, EDict, funcSelf, _self, $$, isOpaque } from "./script";

const ScriptError = 'script error';

// Internal evaluate implementation, that doesn't catch or log exceptions.
export function _eval(scope: Scope, expr: EExpr): EExpr {
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
      let fn = expr as NativeFunc;
      return fn(scope);

    case 'object':
      if (expr === null) {
        return nil;
      }

      // Opaque expressions evaluate to themselves.
      let opaque = isOpaque(expr);
      if (opaque) {
        return expr;
      }

      // :thing is a literal expression, not evaluated.
      let quote = isQuote(expr);
      if (quote) {
        // When evaluating a quoted object (list, dict, symbol), mark the contained object with the current scope.
        // This scope will be used to evaluate its references later.
        return quote._expr_quote;
      }

      // [f[x] [...]] evaluates to itself.
      let func = isFunc(expr);
      if (func) {
        return func;
      }

      // foo ({_expr_sym: 'foo'} at runtime) is an identifier.
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
      let dict = isDict(expr);
      if (dict) {
        return evalDict(scope, dict);
      }

      // Generic (native) scope.
      let newScope = isScope(expr);
      if (newScope) {
        return newScope;
      }

    // No idea what this is. Fall through.
  }

  // TODO: Which cases actually end up here?
  console.log("something funky this way comes", _print(expr));
  return expr;
}

function evalDict(scope: Scope, dict: EDict): EDict {
  // TODO: Necessary, but couldn't this be simpler?
  let parent = scopeParent(dict);
  if (parent !== nil) {
    // TODO: This shuffle seems kind of gross.
    // Seems to be needed to avoid double eval'ing of parent:
    let maybeScope = isScope(parent);
    if (!maybeScope) {
      maybeScope = isScope(_eval(scope, parent));
      scopeDef(dict, $('parent'), maybeScope);
    }
    scope = isScope(maybeScope);
  }

  // Copy the dict to a new expression, so we're not mutating the original.
  let result = {} as EDict;
  for (let key in dict) {
    result[key] = dict[key];

    if (!(key in _specials)) {
      result[key] = _eval(scope, result[key]);
    }
  }

  // Dicts without an explicit parent automatically get the current scope.
  if (!('parent' in result)) {
    result['parent'] = scope;
  }
  return result;
}

export function _apply(scope: Scope, list: EList): EExpr {
  // Special forms.
  let [result, found] = applySpecial(scope, list);
  if (found) {
    return result;
  }

  // [arg-scope expr] => expr
  // TODO: [{scope} expr expr*] for mixed scope + positional args
  let elem0 = _eval(scope, list[0]);
  let argScope = isScope(elem0);
  if (argScope && list.length > 1) {
    let expr = _eval(argScope, list[1]);
    let exprSym = isSym(expr);
    if (exprSym) {
      // For the [{scope}:sym] case, short-circuit all the logic below. This is simpler, but also avoids a squirrely edge
      // case that breaks [{scope}:parent].
      return maybeWrapFunc(argScope, expr, _eval(argScope, exprSym));
    } else {
      // Explicit env argument override.
      let overrideEnv = isScope(scopeRef(argScope, $('env')));

      // If expr is a function, unwrap it.
      // [scope func] => [new-scope func-expr]
      let func = isFunc(expr)
      let exprEnv: Scope;
      if (func) {
        // Functions have an attached default environment.
        exprEnv = funcScope(func);
        expr = funcExpr(func);
        // TODO: Validate params?
      } else {
        // Expressions take their default environment from the arg scope.
        exprEnv = argScope;
      }

      let env = overrideEnv ? overrideEnv : exprEnv;

      // Create a new frame and eval the expression within it.
      // TODO: Do we really need to copy env over to the frame? Caller seems to be the only reason.
      let frame = scopeNew(env, scope, func);
      for (let name of scopeNames(argScope)) {
        let sym = $(name);
        scopeDef(frame, sym, scopeRef(argScope, sym));
      }

      // Add func's self to frame if specified.
      if (func) {
        let self = funcSelf(func);
        if (self) {
          scopeDef(frame, _self, self);
        }
      }
      return maybeWrapFunc(argScope, expr, _eval(frame, expr));
    }
  }

  // Transform application of positional arguments to func.
  // [func expr*] => [scope :func]
  let func = isFunc(elem0);
  if (func) {
    let params = funcParams(func);
    let frame = scopeNew(scope, scope, func);
    let args = list.slice(1)
    for (let i = 0; i < params.length; i++) {
      // Don't eval args; they'll get evaluated after the scope transform.
      let sym = isSym(params[i]);
      if (!sym) {
        chuck(scope, `expected sym at param ${i}, but got ${params[i]}`);
      }
      scopeDef(frame, sym, args[i]);
    }
    return _eval(scope, [frame, func]);
  }

  // [expr]
  return _eval(scope, elem0);
}

function maybeWrapFunc(scope: Scope, expr: EExpr, result: EExpr): EExpr {
  let rfunc = isFunc(result);
  let funcSym = isSym(expr);
  if (rfunc && funcSym) {
    return {
      _expr_scope: rfunc._expr_scope,
      _expr_func: rfunc._expr_func,
      _expr_name: symName(funcSym),
      _expr_self: scope,
    };
  }
  return result;
}

function applySpecial(scope: Scope, list: EList): [EExpr, boolean] {
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
      return [{
        _expr_func: [params, list.slice(i + 1)],
        _expr_scope: scope
      }, true];
    }
    params.push(sym);
  }

  return [nil, false];
}

function applyDo(scope: Scope, list: EList): EExpr {
  let last: EExpr;
  for (let i = 1; i < list.length; i++) {
    last = _eval(scope, list[i]);
  }
  return last;
}

function applyDef(scope: Scope, list: EList): EExpr {
  let arg0 = _eval(scope, list[1]);
  let arg1 = _eval(scope, list[2]);
  let ctx = isScope(arg0);
  if (ctx) {
    let value = _eval(scope, list[3]);
    return scopeDef(ctx, isSym(arg1), value);
  }
  return scopeDef(scope, isSym(arg0), arg1);
}

function applySet(scope: Scope, list: EList): EExpr {
  let arg0 = _eval(scope, list[1]);
  let arg1 = _eval(scope, list[2]);

  let ctx = isScope(arg0);
  if (ctx) {
    // When scope is explicitly specified, set the value directly at that scope.
    let sym = isSym(arg1);
    let value = _eval(scope, list[3]);
    return scopeDef(ctx, sym, value);
  }

  // If scope is unspecified, set the value at the nearest scope where it's defined.
  let sym = isSym(arg0);
  let target = scopeFind(scope, sym);
  if (!target) {
    chuck(scope, `${_print(sym)} undefined`);
  }
  return scopeDef(target, sym, arg1);
}

function applyExists(scope: Scope, list: EList): EExpr {
  let arg0 = _eval(scope, list[1]);
  let arg1 = _eval(scope, list[2]);

  let sym: ESym;
  let ctx = isScope(arg0);
  if (ctx) {
    sym = isSym(arg1);
  } else {
    ctx = scope;
    sym = isSym(arg0);
  }

  return !!scopeFind(ctx, sym);
}
