import { _eval } from "../script/eval";
import { _ns, _root } from "../script/dict";
import { _parse } from "../script/parse";

import player from "./player.kurt";

export function nsActors() {
  _ns("Actors", [player]);
}
