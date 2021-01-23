import { Entity, locEnt, NativeComp } from "./entity";
import { Scope } from "./script/scope";
import { $, _blk, _def, _do } from "./script/script";

export class Loc extends NativeComp {
  static Dict = {
    make: [$('ent'), _blk, (scope: Scope) => {
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
