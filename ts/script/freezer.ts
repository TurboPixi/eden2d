import { Dict, IDict, _root } from "./dict";
import { locStr, lookupSym, TeeEnv } from "./env";
import { $, _blk, _def } from "./script";

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

export var _freeze = [$('x'), _blk, (env: Dict) => {
  return JSON.stringify(lookupSym(env, $('x')), (k, v) => {
    if (k == '[marker]') {
      return undefined;
    }

    if (typeof v === 'object') {
      if (v['[marker]']) {
        return '[ref]';
      }

      if ('native' in v) {
        return v['native']();
      }

      v['[marker]'] = true;
    } else if (typeof v === 'function') {
      return `[native ${v.name}]`;
    }
    return v;
  })
}];

export var _thaw = [$('x'), _blk, (env: Dict) => {
  return JSON.parse(locStr(env, $('x')), (k, v) => {
    if (typeof v === 'object') {
      if ('native' in v) {
        return _defrosters[v['native']](v);
      }
    }
    return v;
  })
}];
