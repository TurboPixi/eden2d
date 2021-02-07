import { NativeComp } from "../entity";
import { Dict, _root } from "../script/dict";
import { _eval } from "../script/eval";
import { _parse } from "../script/parse";
import { $, $$, EExpr, _blk, _def, _do } from "../script/script";

export class LocComp extends NativeComp {
  static Dict = {
    'make': [_blk, (env: Dict) => {
      return {'loc': new LocComp(env)};
    }],

    'impl': _parse('Loc:impl', `{
      perform = [ent action |
        [if [= action:action :move] [| do
          [set @ {dx = action:dx dy = action:dy}]
        ]]
      ]
    }`),
  };

  '[parent]': EExpr;
  dx = 0;
  dy = 0;
  x = 0;
  y = 0;

  constructor(env: Dict) {
    super();
    this['[parent]'] = _eval(env, [$('LocComp'), $$('impl')]);
  }
}
