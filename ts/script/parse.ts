import { parse, SyntaxError } from "./kurt";
import { EExpr } from "./script";

export function _parse(unit: string, src: string): EExpr {
  try {
    return parse(src);
  } catch (e) {
    if (e instanceof SyntaxError) {
      let line = e.location.start.line;
      let col = e.location.start.column;
      throw new Error(`error parsing ${unit}: unexpected ${e.found} at ${line}:${col}`);
    }
    throw e;
  }
}
