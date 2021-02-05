import { BaseTexture, Loader, MIPMAP_MODES, Rectangle, SCALE_MODES, Sprite, Texture } from "pixi.js";

const _preload = [
  "images/floors.png", "images/wall-stone-blue.png", "images/stairs.png", "images/char-female.png", "images/crate.png"
];

interface Image {
  tex: string;
  x: number; y: number;
  w: number; h: number;
  ax: number; ay: number;
}

function img(tex: string, x?: number, y?: number, w?: number, h?: number, ax?: number, ay?: number): Image {
  return {
    tex: tex,
    x: x || 0, y: y || 0,
    w: w || 16, h: h || 16,
    ax: ax || 0, ay: ay || 0
  }
}

export class Resources {
  private static _texCache: { [key: string]: Texture } = {};

  private constructor() { }

  static load(done: () => void) {
    let loader = new Loader();
    for (let fn of _preload) {
      loader.add(fn);
    }
    loader.load(done);
  }

  static tex(key: string): BaseTexture {
    let btex = BaseTexture.from(key);
    btex.scaleMode = SCALE_MODES.NEAREST;
    btex.mipmap = MIPMAP_MODES.OFF;
    return btex;
  }
}
