import { Rectangle, Sprite, Texture } from "pixi.js";
import { NativeComp } from "../entity";
import { Resources } from "../res";
import { Dict } from "../script/dict";
import { locDict, locOpaque, locStr } from "../script/env";
import { $, EOpaque, makeOpaque, opaqueVal, _blk } from "../script/script";

interface ImageFrame {
  x: number;
  y: number;
  w?: number;
  h?: number;
  ax?: number;
  ay?: number;
}

export class Rendered extends NativeComp {
  static Dict = {
    make: [$('img'), _blk, (env: Dict) => {
      let r = new Rendered();
      r.sprite.texture = opaqueVal(locOpaque(env, $('img'))) as Texture;
      r.sprite.anchor = r.sprite.texture.defaultAnchor;
      return {'rendered': r};
    }],

    image: [$('file'), $('frame'), _blk, (env: Dict) => {
      let file = locStr(env, $('file'));
      let frame = locDict(env, $('frame')) as unknown as ImageFrame;
      let x = frame.x || 0, y = frame.y || 0;
      let w = frame.w || 16, h = frame.h || 16;

      let btex = Resources.tex(file);
      let tex = new Texture(btex, new Rectangle(x, y, w, h));
      tex.defaultAnchor.x = frame.ax ? (frame.ax / w) : 0;
      tex.defaultAnchor.y = frame.ay ? (frame.ay / h) : 0;
      return makeOpaque(tex);
    }],
  };

  set image(otex: EOpaque) {
    let tex = opaqueVal(otex) as Texture;
    this.sprite.texture = tex;
    this.sprite.anchor = tex.defaultAnchor;
  }

  sprite: Sprite;

  constructor() {
    super();
    this.sprite = new Sprite();
  }
}
