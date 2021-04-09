import { NativeComp } from "../entity";
import { Dict, _root } from "../script/dict";
import { _eval } from "../script/eval";
import { _parse } from "../script/parse";
import { $, $$, EExpr, _blk, _def, _do, _parentName } from "../script/script";

export class Located extends NativeComp {
  static Dict = {
    'make': [_blk, (env: Dict) => {
      return {'loc': new Located(env)};
    }],

    'impl': _parse('Located:impl', `{
      perform: (ent action |
        if [= action:action :move] (do
          [set @ {dx: action:dx dy: action:dy}]
        )
      )
    }`),
  };

  '^': EExpr;
  dx = 0;
  dy = 0;
  x = 0;
  y = 0;

  constructor(env: Dict) {
    super();
    this[_parentName] = _eval(env, [$('Located'), $$('impl')]);
  }
}
