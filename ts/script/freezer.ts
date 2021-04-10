import { Dict, IDict, isTagProp, _root } from "./dict";
import { lookupSym } from "./env";
import { $, blockEnv, blockExpr, blockName, blockParams, EExpr, fullQuoteExpr, isBlock, isFullQuote, isQuote, isSym, nil, quoteExpr, symName, _blk, _def } from "./script";

export type Defroster = (obj: any) => IDict;
var _defrosters: { [name: string]: Defroster } = {};

export function registerDefroster(name: string, defroster: Defroster) {
  if (name in _defrosters) {
    throw `initialization failure: defroster ${name} registered multiple times`
  }
  _defrosters[name] = defroster;
}

// Stuck this one here to fix circular def.
registerDefroster('root', (obj) => {
  return _root;
});

type FreezeArr = (null|boolean|number|string)[];

// Uses a simple JSON flat array format for now:
//  Primitives:
//   undefined: nil
//   true/false: boolean
//   123.456: number
//   '"something': string
//   '$something": symbol
//  Natives:
//   '!name': native expression
//  Quotes:
//   ':': quote next expression
//   '\': fully quote next expression
//  Lists, maps, & blocks:
//   '[' expression* ']': list
//   '{' (symbol, expression)* '}': dict
//   '(' name, params, env, expr ')': block -- TODO: self?
//  Ids & Refs:
//   '>id': set current list/map/block id (must be first item after open delimiter)
//   '<id': ref to expression id
//
// TODO:
// - Figure out an efficient way to tag only objects that are referenced.
// - Make this work more than once ([id] leaves dingleberries that will break the second call).
//
export var _freeze = [$('x'), _blk, (env: Dict) => {
  let obj = lookupSym(env, $('x'));
  let arr: FreezeArr = [];
  function freezer(obj: any): void {
    switch (typeof obj) {
      case 'undefined':
      case 'number':
      case 'boolean':
        arr.push(obj);
        break;
      case 'string':
        arr.push('"' + obj);
        break;
      case 'function':
        arr.push('!' + obj.name);
        break;
      case 'object':
        if (isSym(obj)) {
          arr.push('-' + symName(obj));
          return;
        } else if (isQuote(obj)) {
          arr.push(':')
          freezer(quoteExpr(obj));
          return;
        } else if (isFullQuote(obj)) {
          arr.push('\\');
          freezer(fullQuoteExpr(obj));
          return;
        } else if (isBlock(obj)) {
          arr.push('(');
          freezer(blockName(obj));
          freezer(blockParams(obj));
          freezer(blockEnv(obj));
          freezer(blockExpr(obj));
          arr.push(')');
          return;
        } else if (('native' in obj) && (typeof obj['native'] == 'function')) {
          freezer(obj['native']());
          return;
        }

        // Only arrays and dicts get an id.
        if ('[id]' in obj) {
          let id = obj['[id]'] as number;
          if (!('[mark]' in obj)) {
            arr.splice(id + 1, 0, '>' + id);
            obj['[mark]'] = true;
          }
          arr.push('<' + id);
          return;
        }
        obj['[id]'] = arr.length;

        if (obj.constructor == Array) {
          arr.push('[');
          for (var i = 0; i < obj.length; i++) {
            freezer(obj[i]);
          }
          arr.push(']');
          return;
        }

        arr.push('{');
        for (let key in obj) {
          if (key == '[id]' || isTagProp(key)) {
            continue;
          }
          arr.push('-' + key);
          freezer(obj[key]);
        }
        arr.push('}');
        return;

      default:
        throw "unknown type for " + obj;
    }
  }

  freezer(obj);
  // return JSON.stringify(arr);
  return arr.join(" ");
}];

export var _thaw = [$('x'), _blk, (env: Dict) => {
  // TODO: Thaw it out!
  return nil
}];
