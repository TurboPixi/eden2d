import { _ns } from "../script/dict";
import { _def } from "../script/script";
import { Located } from "./located";
import { Rendered } from "./rendered";
import { _eval } from "../script/eval";

import solid from "./solid.kurt";
import portable from "./portable.kurt";
import ticks from "./ticks.kurt";
import usable from "./usable.kurt";
import programmed from "./programmed.kurt";
import contains from "./contains.kurt";
import transports from "./transports.kurt";
import animated from "./animated.kurt";
import flaming from "./flaming.kurt";

export function nsComps() {
  let Comps = _ns("Comps", [
    solid, portable, ticks, usable, programmed,
    contains, transports, animated, flaming
  ]);

  _eval(Comps, [_def, {
    'Located': Located.Dict,
    'Rendered': Rendered.Dict,
  }]);
}
