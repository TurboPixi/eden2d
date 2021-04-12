import { Rectangle, Sprite, Texture } from "pixi.js";
import { NativeComp } from "../entity";
import { Resources } from "../res";
import { Dict } from "../script/dict";
import { locDict, locStr, lookupSym } from "../script/env";
import { registerDefroster } from "../script/freezer";
import { $, EExpr, _blk } from "../script/script";

interface ImageFrame {
  x: number;
  y: number;
  w?: number;
  h?: number;
  ax?: number;
  ay?: number;
}

export class Image extends NativeComp {
  tex: Texture;

  constructor(public file: string, public frame: ImageFrame) {
    super();

    let x = frame.x || 0, y = frame.y || 0;
    let w = frame.w || 16, h = frame.h || 16;

    let btex = Resources.tex(file);
    let tex = new Texture(btex, new Rectangle(x, y, w, h));
    tex.defaultAnchor.x = frame.ax ? (frame.ax / w) : 0;
    tex.defaultAnchor.y = frame.ay ? (frame.ay / h) : 0;
    this.tex = tex;
  }

  freeze(): any {
    return {
      native: "Image",
      file: this.file,
      frame: this.frame,
    };
  }
}

export class Rendered extends NativeComp {
  static Dict = {
    make: [$('img'), _blk, (env: Dict) => {
      let img = lookupSym(env, $('img')) as Image;
      let r = new Rendered();
      r.image = img;
      return { 'rendered': r };
    }],

    image: [$('file'), $('frame'), _blk, (env: Dict) => {
      let file = locStr(env, $('file'));
      let frame = locDict(env, $('frame')) as unknown as ImageFrame;
      return new Image(file, frame);
    }],

    'freeze': (env: Dict) => {
      return () => { return { native: 'Entity.Dict' } }
    },
  };

  set image(expr: EExpr) {
    this.img = expr as Image;
    this.sprite.texture = this.img.tex;
    this.sprite.anchor = this.img.tex.defaultAnchor;
  }

  img: Image;
  sprite: Sprite;

  constructor() {
    super();
    this.sprite = new Sprite();
  }

  freeze(): any {
    return {
      native: 'Rendered',
      img: this.img,
    }
  }
}

registerDefroster("Image", (obj) => new Image(obj['file'], obj['frame']));
registerDefroster("Rendered.Dict", (obj) => Rendered.Dict);
registerDefroster('Rendered', (obj) => {
  var rend = new Rendered();
  rend.image = obj['img'];
  return rend;
});
