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

  private imageKey: string;

  get 'image-key'(): string {
    return this.imageKey;
  }

  set 'image-key'(key: string) {
    this.imageKey = key;
    this.sprite = Resources.sprite(this['image-key']);
  }

  sprite: Sprite;

  constructor(ent: Entity, imageKey: string) {
    super();
    this['image-key'] = imageKey;
    ent.def($('render'), this);
  }
}
