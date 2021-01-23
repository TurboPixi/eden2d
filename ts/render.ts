import { Sprite } from "pixi.js";
import { Entity, locEnt, NativeComp } from "./entity";
import { ImageKey, Resources } from "./res";
import { Dict } from "./script/dict";
import { locStr } from "./script/scope";
import { $, _blk } from "./script/script";

export class Render extends NativeComp {
  static Dict = {
    make: [$('ent'), $('image-key'), _blk, (scope: Dict) => {
      return new Render(
        locEnt(scope, $('ent')),
        locStr(scope, $('image-key'))
      );
    }],
  };

  'image-key': ImageKey;
  sprite: Sprite;

  constructor(ent: Entity, imageKey: string) {
    super();

    this['image-key'] = imageKey as ImageKey;
    this.sprite = Resources.sprite(this['image-key']);
    ent.def($('render'), this);
  }
}
