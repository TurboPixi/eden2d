import { Scope, scopeCaller, scopeNames, scopeRef } from "./scope";
import { $, isList, EExpr, isSym, isDict, isQuote, isFunc, funcParams, funcExpr, nil, funcName } from "./script";

(window as any)['_print'] = _print;

const _specials = {
  "parent": true,
  "caller": true,
}

export function printStack(scope: Scope): string {
  let msg = '';
  while (scope) {
    // TODO: Something with scope names
    // msg += `[${scope.name}] - `
    for (let name of scopeNames(scope)) {
      msg += `${name}: ${_print(scopeRef(scope, $(name)))} `
    }
    msg += '\n';
    scope = scopeCaller(scope);
  }
  return msg;
}

export function _print(expr: EExpr): string {
  switch (typeof expr) {
    case "number":
    case "boolean":
      return "" + expr;
    case "string":
      return `"${expr}"`;
    case "undefined":
      return "nil";
    case "function":
      return `[native ${expr.name}]`; // TODO: Name isn't actually there.

    case "object":
      let quote = isQuote(expr);
      let func = isFunc(expr);
      if (quote) {
        return ":" + _print(quote._expr_quote);
      } else if (func) {
        let params = funcParams(func);
        let name = funcName(func);
        return `[f${name ? "-[" + name + "]-" : ""}${_print(funcParams(func))} ${_print(funcExpr(func))}]`
      } else if (isList(expr)) {
        return `[${isList(expr).map((val) => _print(val)).join(" ")}]`;
      } else if (isSym(expr)) {
        return `${isSym(expr)._expr_sym}`;
      } else if (isDict(expr)) {
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
