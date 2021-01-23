import { _eval } from "./script/eval";
import { parse } from "./script/kurt";
import { IDict, dictDef, _root } from "./script/dict";
import { $, $$, EDict, EExpr, ESym, symName, _def, _parentTag } from "./script/script";
import { World } from "./world";

import ui_kurt from "./ui.kurt";

// Just a native namespace bag for now, mostly to explore the pattern of how one might do this.
// May eventually add more significant UI-related functionality here.
export class UI implements IDict {
  private _defs: EDict = {};

  constructor(world: World) {
    dictDef(this, _parentTag, world);
    _eval(this, parse(ui_kurt));
    _eval(world, [_def, {'UI': this}]);
  }

  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(sym: ESym): EExpr { return this._defs[symName(sym)] }
  def(sym: ESym, value: EExpr): void { this._defs[symName(sym)] = value }
}
