import { Entity, locEnt, NativeComp } from "../entity";
import { Dict, _root } from "../script/dict";
import { _eval } from "../script/eval";
import { parse } from "../script/kurt";
import { $, $$, EExpr, _blk, _def, _do } from "../script/script";

export class LocComp extends NativeComp {
  static Dict = {
    'make': [$('ent'), _blk, (env: Dict) => {
      return new LocComp(env, locEnt(env, $('ent')))
    }],

    'impl': parse(`{
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

  constructor(env: Dict, ent: Entity) {
    super();
    this['[parent]'] = _eval(env, [$('LocComp'), $$('impl')]);
    ent.def($('loc'), this);
  }
}
