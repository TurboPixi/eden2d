import { _ns } from "../script/dict";

import ui_kurt from "./ui.kurt";
import progpanel from "./progpanel.kurt";
import worldpanel from "./worldpanel.kurt";

export function nsUI() {
  _ns("UI", [ui_kurt, progpanel, worldpanel]);
}
