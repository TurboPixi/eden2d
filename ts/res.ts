import { BaseTexture, Loader, MIPMAP_MODES, Rectangle, SCALE_MODES, Sprite, Texture } from "pixi.js";

const _preload: string[] = [
];

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
