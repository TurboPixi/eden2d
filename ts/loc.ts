import { Entity, locEnt, NativeComp } from "./entity";
import { Dict, _root } from "./script/dict";
import { _eval } from "./script/eval";
import { parse } from "./script/kurt";
import { $, $$, EExpr, _blk, _def, _do } from "./script/script";

export class Loc extends NativeComp {
  static Dict = {
    'make': [$('ent'), _blk, (env: Dict) => {
      return new Loc(env, locEnt(env, $('ent')))
    }],

    'impl': parse(`{
      perform = [ent action |
        [if [= action:action :move] [| do
          [def {loc = ent:loc}]
          [ent:move-to [+ loc:x action:dx] [+ loc:y action:dy]]
        ]]
      ]
    }`),
  };

  x = 0;
  y = 0;
  '[parent]': EExpr;

  constructor(env: Dict, ent: Entity) {
    super();
    this['[parent]'] = _eval(env, [$('Loc'), $$('impl')]);
    ent.def($('loc'), this);
  }
}
