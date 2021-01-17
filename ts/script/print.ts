import { Scope, scopeCaller, scopeFunc, scopeNames, scopeRef, _specials } from "./scope";
import { $, isList, EExpr, isSym, isDict, isQuote, isFunc, funcParams, funcExpr, nil, funcName, isOpaque } from "./script";

(window as any)['_print'] = _print;
(window as any)['_printStack'] = _printStack;

export function _printStack(scope: Scope): string {
  let msg = '';
  while (scope) {
    let fn = scopeFunc(scope);
    if (fn && fn._expr_name) {
      msg += `:${fn._expr_name} [`;
    } else {
      msg += ":(anon) [";
    }

    for (let name of scopeNames(scope)) {
      msg += `${name}: ${_print(scopeRef(scope, $(name)), true)} `
    }
    msg += '| ... ]\n';
    scope = scopeCaller(scope);
  }
  return msg;
}

export function _print(expr: EExpr, short = false): string {
  switch (typeof expr) {
    case "number":
    case "boolean":
      return "" + expr;
    case "string":
      return `"${expr}"`;
    case "undefined":
      return "nil";
    case "function":
      return `<native>`; // TODO: Name isn't actually there.

    case "object":
      let quote = isQuote(expr);
      let func = isFunc(expr);
      let opaque = isOpaque(expr);
      if (quote) {
        return ":" + _print(quote._expr_quote);
      } else if (opaque) {
        return "<opaque>";
      } else if (func) {
        let params = funcParams(func);
        let name = funcName(func);
        return `${name ? "-[" + name + "]-" : ""} [${_print(params)} | ${short ? "..." : _print(funcExpr(func))}]`
      } else if (isList(expr)) {
        return short ? "[...]" : `[${isList(expr).map((val) => _print(val)).join(" ")}]`;
      } else if (isSym(expr)) {
        return `${isSym(expr)._expr_sym}`;
      } else if (isDict(expr)) {
        if (short) {
          return "{...}";
        }

        let obj = expr as { [key: string]: EExpr };
        let entries: string[] = [];
        for (let key in obj) {
          if (!(key in _specials)) {
            let entry = "";
            entry += key;
            if (obj[key] !== nil) {
              entry += `:${_print(obj[key])}`
            }
            entries.push(entry);
          }
        }
        return `{${entries.join(" ")}}`;
      } else if (expr == null) {
        return "nil";
      } else {
        return `<${expr.constructor ? expr.constructor.name : "?"}>`;
      }
      break;
  }

  return `[unknown ${expr}]`
}
