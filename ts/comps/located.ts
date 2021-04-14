import { NativeComp } from "../entity";
import { Dict, _root } from "../script/dict";
import { _eval } from "../script/eval";
import { registerDefroster } from "../script/freezer";
import { _parse } from "../script/parse";
import { $, $$, EExpr, _blk, _def, _do, _parentName } from "../script/script";

export class Located extends NativeComp {
  static Dict = {
    'make': [_blk, (env: Dict) => {
      return {'loc': new Located()};
    }],

    'impl': _parse('Located:impl', `{
      perform: (ent action |
        if [= action:action :move] (do
          [set @ {dx: action:dx dy: action:dy}]
        )
      )
    }`),

    'freeze': (env: Dict) => {
      return function() {
        return { native: 'Located.Dict' };
      }
    },
  };

  '^': EExpr;
  dx = 0;
  dy = 0;
  dz = 0;
  x = 0;
  y = 0;
  z = 0;

  constructor() {
    super();
    this[_parentName] = _eval(_root, [[$('Comps'), $$('Located')], $$('impl')]);
  }

  freeze(): any {
    return {
      native: 'Located',
      x:this.x, y:this.y, z:this.z,
      dx:this.dx, dy:this.dy, dz:this.dz,
    }
  }
}

registerDefroster("Located.Dict", (obj) => Located.Dict);
registerDefroster("Located", (obj) => {
  let loc = new Located();
  loc.dx = obj['dx'];
  loc.dy = obj['dy'];
  loc.dy = obj['dz'];
  loc.x = obj['x'];
  loc.y = obj['y'];
  loc.y = obj['z'];
  return loc;
});
