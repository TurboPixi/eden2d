import { _eval } from "../script/eval";
import { _ns, _root } from "../script/dict";
import { _parse } from "../script/parse";

import floor from "./floor.kurt";
import wall from "./wall.kurt";
import stairs from "./stairs.kurt";
import door from "./door.kurt";

export function nsBlocks() {
  _ns("Blocks", [floor, wall, stairs, door]);
}
