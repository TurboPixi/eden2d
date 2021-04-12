import { Dict, isTagProp, _root } from "./dict";
import { locStr, lookupSym } from "./env";
import { $, blockEnv, blockExpr, blockName, blockParams, EBlock, EDict, EExpr, ESym, fq, fullQuoteExpr, isBlock, isFullQuote, isQuote, isSym, nil, quoteExpr, symName, _, _blk, _def, __ } from "./script";

export type Defroster = (obj: any) => Dict;
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

// Freeze mark counter, used to [mark] objects in cycle checks with a different check number each time.
var freezeCounter = 0;

// Uses a simple JSON flat array format for now:
//  Primitives:
//   undefined: nil
//   true/false: boolean
//   123.456: number
//   '"something': string
//   '$something": symbol
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
export var _freeze = [$('x'), _blk, (env: Dict) => {
  // Get a new freeze mark counter for cycle checks.
  freezeCounter++;

  let curId = 1;
  let obj = lookupSym(env, $('x'));
  let arr: FreezeArr = [];
  let marked: {[id: number]: true} = {};
  function freezer(obj: any): void {
    switch (typeof obj) {
      case 'undefined':
      case 'number':
      case 'boolean':
        arr.push(obj);
        break;

      case 'function':
        throw `cannot serialize native functions (${obj})`;

      case 'string':
        arr.push('"' + obj);
        break;

      case 'object':
        if (isSym(obj)) {
          arr.push('$' + symName(obj));
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
        }

        // Only arrays and dicts get an id.
        if (obj['[mark]'] == freezeCounter) {
          let id = obj['[id]'] as number;
          arr.push('<' + id);
          if (!marked[id]) {
            marked[id] = true;
          }
          return;
        }
        obj['[mark]'] = freezeCounter;
        obj['[id]'] = curId++;

        if (('freeze' in obj) && (typeof obj['freeze'] == 'function')) {
          obj = obj['freeze']();
        }

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
          arr.push('$' + key);
          freezer(obj[key]);
        }
        arr.push('}');
        return;

      default:
        throw "unknown type for " + obj;
    }
  }

  freezer(obj);
  console.log(arr.join(" ")); // for debugging
  return JSON.stringify(arr);
}];

export var _thaw = [$('x'), _blk, (env: Dict) => {
  let arr: FreezeArr = JSON.parse(locStr(env, $('x')));
  let refs: {[id: number]: any} = {};
  let curId = 1;
  let idx = 0;
  function thawer(): any {
    let tok = arr[idx++];
    switch (typeof tok) {
      case 'undefined':
      case 'boolean':
      case 'number':
        return tok;

      case 'string':
        switch (tok[0]) {
          case '"':
            return tok.slice(1);
          case '$':
            return $(tok.slice(1));
          case ':':
            return _(thawer());
          case '!':
            throw "nyi"; // TODO
          case '\\':
            return fq(thawer());
          case '<':
            let id = parseInt(tok.slice(1));
            if (!(id in refs)) {
              throw `missing id ${id} in refs`;
            }
            return refs[id];
          case '[':
            let list: FreezeArr = [];
            refs[curId++] = list;
            while (arr[idx] != ']') {
              list.push(thawer())
            }
            idx++; // skip ]
            return list;
          case '{':
            let dict: EDict = {};
            let refId = curId;
            refs[curId++] = dict;
            let defrost: Defroster;
            while (arr[idx] != '}') {
              let key = thawer() as ESym;
              let val = thawer();
              let name = symName(key);
              if (name == 'native') {
                if (!(val in _defrosters)) {
                  throw `defroster "${val}" not found`;
                }
                defrost = _defrosters[val];
              } else {
                dict[name] = val;
              }
            }
            idx++; // skip }
            if (defrost) {
              let defrosted = defrost(dict);
              refs[refId] = defrosted;
              return defrosted;
            }
            return dict;
          case '(':
            // [name, params, env, expr] -- TODO: self?
            let name = thawer();
            let params = thawer();
            let env = thawer();
            let expr = thawer();
            idx++; // skip )
            return { '[block]': [params, expr], '[env]': env, '[name]': name, '[self]': nil };
        }
    }
  }

  return thawer();
}];
