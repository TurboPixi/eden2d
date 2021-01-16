import { Sprite } from "pixi.js";
import { Entity, locEnt, NativeComp } from "./entity";
import { ImageKey, Resources } from "./res";
import { locStr, Scope } from "./script/scope";
import { $, _blk } from "./script/script";

export class Render extends NativeComp {
  static Dict = {
    make: [$('ent'), $('image-key'), _blk, (scope: Scope) => {
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
    ent.setComp($('render'), this);
  }
}
