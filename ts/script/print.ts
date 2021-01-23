import { Dict, dictNames, dictRef, isEDict, _specials } from "./dict";
import { scopeCaller, scopeName } from "./scope";
import { $, isList, EExpr, isSym, isQuote, isBlock, blockParams, blockExpr, nil, blockName, QuoteMarker, SymMarker } from "./script";

(window as any)['_print'] = _print;
(window as any)['_printStack'] = _printStack;

export function _printStack(scope: Dict): string {
  let msg = '';
  while (scope) {
    let name = scopeName(scope);
    if (name) {
      msg += `:${name} [`;
    } else {
      msg += ":(anon) [";
    }

    for (let name of dictNames(scope)) {
      msg += `${name}: ${_print(dictRef(scope, $(name)), true)} `
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
      let block = isBlock(expr);
      if (quote) {
        return ":" + _print(quote[QuoteMarker]);
      } else if (block) {
        let params = blockParams(block);
        let name = blockName(block);
        return `${name ? "-[" + name + "]-" : ""} [${_print(params)} | ${short ? "..." : _print(blockExpr(block))}]`
      } else if (isList(expr)) {
        return short ? "[...]" : `[${isList(expr).map((val) => _print(val)).join(" ")}]`;
      } else if (isSym(expr)) {
        return `${isSym(expr)[SymMarker]}`;
      } else if (isEDict(expr)) {
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
