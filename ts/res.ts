import { BaseTexture, Loader, MIPMAP_MODES, Rectangle, SCALE_MODES, Sprite, Texture } from "pixi.js";

export enum TexKey {
  Tiles = "tiles",
  Player = "player",
  Items = "items",
}

const _texMap: { [key: string]: string } = {
  "tiles": "rogue/environment.png",
  "player": "rogue/player0.png",
  "items": "rogue/items.png",
};


export enum ImageKey {
  TileEmpty = "tile-empty",
  TileBlueTile = "tile-blue-tile",
  TileBlueTile1 = "tile-blue-tile-1",
  TileBlueWall = "tile-blue-wall",
  TileBlueWallW = "tile-blue-wall-w",
  TileBlueWallEW = "tile-blue-wall-ew",
  TileBlueWallE = "tile-blue-wall-e",
  TileStairDown = "tile-stair-down",
  TileStairUp = "tile-stair-up",

  Player0 = "player-0",
  ObjectKey = "object-key",
  ObjectCrate = "object-crate"
}

const _imageMap: { [key: string]: Image } = {
  "tile-empty": img(TexKey.Tiles, 4 * 16, 4 * 16),
  "tile-blue-tile": img(TexKey.Tiles, 5 * 16, 0 * 16),
  "tile-blue-tile-1": img(TexKey.Tiles, 5 * 16, 1 * 16),
  "tile-blue-wall": img(TexKey.Tiles, 4 * 16, 1 * 16),
  "tile-blue-wall-w": img(TexKey.Tiles, 1 * 16, 1 * 16),
  "tile-blue-wall-e": img(TexKey.Tiles, 2 * 16, 1 * 16),
  "tile-blue-wall-ew": img(TexKey.Tiles, 2 * 16, 0 * 16),
  "tile-stair-down": img(TexKey.Tiles, 5 * 16, 7 * 16),
  "tile-stair-up": img(TexKey.Tiles, 6 * 16, 7 * 16),

  "player-0": img(TexKey.Player, 16, 0, 16, 24, 0, 1-(12/24)),
  "object-key": img(TexKey.Items, 0, 0),
  "object-crate": img(TexKey.Tiles, 7 * 16, 9 * 16),
};

interface Image {
  tex: TexKey;
  x: number; y: number;
  w: number; h: number;
  ax: number; ay: number;
}

function img(tex: TexKey, x?: number, y?: number, w?: number, h?: number, ax?: number, ay?: number): Image {
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
    let loader = new Loader("images/");
    for (let key in _texMap) {
      loader.add(key, _texMap[key]);
    }
    loader.load(done);
  }

  static base(key: TexKey): BaseTexture {
    let btex = BaseTexture.from(key);
    btex.scaleMode = SCALE_MODES.NEAREST;
    btex.mipmap = MIPMAP_MODES.OFF;
    return btex;
  }

  static tex(key: ImageKey): Texture {
    if (!(key in Resources._texCache)) {
      let img = _imageMap[key];
      let btex = Resources.base(img.tex);
      let tex = new Texture(btex, new Rectangle(
        img.x || 0, img.y || 0,
        img.w || 16, img.h || 16));
      tex.defaultAnchor.x = img.ax;
      tex.defaultAnchor.y = img.ay;
      Resources._texCache[key] = tex;
    }
    return Resources._texCache[key];
  }

  static sprite(key: ImageKey): Sprite {
    return new Sprite(Resources.tex(key));
  }
}
