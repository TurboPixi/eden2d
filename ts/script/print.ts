import { Dict, dictNames, dictRef, isEDict, _specialProps } from "./dict";
import { envCaller, envName } from "./env";
import { $, isList, EExpr, isSym, isQuote, isBlock, blockParams, blockExpr, nil, blockName, QuoteMarker, SymMarker, EList, EBlock } from "./script";

(window as any)['_print'] = _print;
(window as any)['_printStack'] = _printStack;

export function _printStack(env: Dict): string {
  let msg = '';
  while (env) {
    let name = envName(env);
    if (name) {
      msg += `:${name} [`;
    } else {
      msg += ":(anon) [";
    }

    for (let name of dictNames(env)) {
      msg += `${name}: ${_print(dictRef(env, $(name)), true)} `
    }
    msg += '| ... ]\n';
    env = envCaller(env);
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
        return `[${name ? "-[" + name + "]-" : ""} ${printListContents(params)} | ${short ? "..." : printBody(block)}]`
      } else if (isList(expr)) {
        return short ? "[...]" : `${printList(isList(expr))}`;
      } else if (isSym(expr)) {
        return `${isSym(expr)[SymMarker]}`;
      } else if (isEDict(expr)) {
        if (short) {
          return "{...}";
        }

        let obj = expr as { [key: string]: EExpr };
        let entries: string[] = [];
        for (let key in obj) {
          if (!(key in _specialProps)) {
            let entry = "";
            entry += key;
            if (obj[key] !== nil) {
              entry += ` = ${_print(obj[key])}`
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

function printBody(block: EBlock): string {
  let body = blockExpr(block);
  let list = isList(body);
  if (list) {
    return printListContents(list);
  }
  return _print(body);
}

function printList(list: EList): string {
  if (list.length == 2) {
    let sym = isSym(list[0]);
    let q = isQuote(list[1]);
    if (sym && q) {
      return `${_print(sym)}${_print(q)}`;
    }
  }

  return `[${printListContents(list)}]`;
}

function printListContents(list: EList): string {
  return list.map((val) => _print(val)).join(" ")
}
