import { evaluate } from "./script/eval";
import { parse } from "./script/kurt";
import { IScope, scopeDef, _root } from "./script/scope";
import { $, $$, EDict, EExpr, ESym, symName, _def } from "./script/script";
import { World } from "./world";

import ui_kurt from "./ui.kurt";

// Just a native namespace bag for now, mostly to explore the pattern of how one might do this.
// May eventually add more significant UI-related functionality here.
export class UI implements IScope {
  private _defs: EDict = {};

  constructor(world: World) {
    scopeDef(this, $('parent'), world);
    evaluate(this, parse(ui_kurt));
    evaluate(world, [_def, $$('UI'), this]);
  }

  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(sym: ESym): EExpr { return this._defs[symName(sym)] }
  def(sym: ESym, value: EExpr): void { this._defs[symName(sym)] = value }
}
