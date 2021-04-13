import { _ns } from "../script/dict";

import floor from "./floor.kurt";
import wall from "./wall.kurt";
import stairs from "./stairs.kurt";
import door from "./door.kurt";

export function nsBlocks() {
  _ns("Blocks", [`[def {
      Located:    Comps:Located
      Rendered:   Comps:Rendered
      Portable:   Comps:Portable
      Programmed: Comps:Programmed
      Usable:     Comps:Usable
      Contains:   Comps:Contains
      Solid:      Comps:Solid
      Transports: Comps:Transports
    }]`,
    floor, wall, stairs, door]);
}
