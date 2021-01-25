import { Sprite } from "pixi.js";
import { Entity, locEnt, NativeComp } from "./entity";
import { Resources } from "./res";
import { Dict } from "./script/dict";
import { locStr } from "./script/env";
import { $, _blk } from "./script/script";

export class Render extends NativeComp {
  static Dict = {
    make: [$('ent'), $('image-key'), _blk, (env: Dict) => {
      return new Render(
        locEnt(env, $('ent')),
        locStr(env, $('image-key'))
      );
    }],
  };

  'image-key': string;
  sprite: Sprite;

  constructor(ent: Entity, imageKey: string) {
    super();

    this['image-key'] = imageKey;
    this.sprite = Resources.sprite(this['image-key']);
    ent.def($('render'), this);
  }
}
