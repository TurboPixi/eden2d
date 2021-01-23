import { Entity, locEnt, NativeComp } from "./entity";
import { Dict } from "./script/dict";
import { $, _blk, _def, _do } from "./script/script";

export class Loc extends NativeComp {
  static Dict = {
    make: [$('ent'), _blk, (scope: Dict) => {
      return new Loc(locEnt(scope, $('ent')))
    }],
  };

  x = 0;
  y = 0;

  constructor(ent: Entity) {
    super();
    ent.def($('loc'), this);
  }
}
