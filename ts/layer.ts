import {
  BaseTexture,
  Container,
  FORMATS,
  Geometry,
  Mesh,
  MIPMAP_MODES,
  SCALE_MODES,
  Shader,
  Texture,
  TYPES
} from "pixi.js";
import { Resources, TexKey } from "./res";

const vert = `
  precision mediump float;
  uniform vec4 view;
  attribute vec2 position;
  varying vec2 uv;

  void main() {
    uv = mix(view.xw, view.zy, 0.5 * (1.0 + position));
    gl_Position = vec4(position, 1, 1);
  }
`

const frag = `
  precision mediump float;
  uniform sampler2D map, tiles;
  uniform vec2 mapSize, tileSize;
  varying vec2 uv;

  void main() {
    vec2 tileCoord = floor(255.0 * texture2D(map, floor(uv) / mapSize).ra);
    gl_FragColor = texture2D(tiles, (tileCoord + fract(uv)) / tileSize);
  }
`

const square = new Geometry().addAttribute('position', [
  -1, -1,
   1, -1,
  -1,  1,
   1,  1,
  -1,  1,
   1, -1
]);

const blankTex = Texture.fromBuffer(new Uint8Array(4), 1, 1);

export enum Tile {
  Empty = tile(4, 4),
  WallBlue0 = tile(4, 1),
  TileBlue0 = tile(5, 0),
}

// Assumes a 16xN tile map.
function tile(u: number, v: number): number {
  return v * 16 + u;
}

export class Layer {
  private shader: Shader;
  private buf: Uint8Array;
  private _tileSize = 16;
  private dirty = false;

  constructor(container: Container, private width: number, private height: number) {
    this.buf = new Uint8Array(width * height * 2);
    const map = BaseTexture.fromBuffer(this.buf, width, height, {
      format: FORMATS.LUMINANCE_ALPHA,
      type: TYPES.UNSIGNED_BYTE,
    });

    this.shader = Shader.from(vert, frag, {
      map: this.mapTex(),
      tiles: blankTex,
      tileSize: [this._tileSize, this._tileSize],
      mapSize: [width, height],
      view: [0, 0, 0, 0]
    })

    const tileMesh = new Mesh(square, this.shader);
    container.addChild(tileMesh);

    const tiles = Resources.base(TexKey.Tiles);
    this.shader.uniforms.tiles = tiles;
  }

  setTile(x: number, y: number, t: Tile) {
    let u = t & 0xf, v = t >> 4;
    const idx = (y * this.width + x) * 2;
    this.buf[idx] = u;
    this.buf[idx + 1] = v;
    this.dirty = true;
  }

  tick(x: number, y: number, z: number, w: number, h: number) {
    if (this.dirty) {
      this.shader.uniforms.map = this.mapTex();
      this.dirty = false;
    }

    z *= 16;
    const boxX = x/z;
    const boxY = y/z;
    const boxW = w/z;
    const boxH = h/z;

    this.shader.uniforms.view = [
      boxX, boxY,
      boxX + boxW, boxY + boxH
    ];
  }

  private mapTex(): BaseTexture {
    return BaseTexture.fromBuffer(this.buf, this.width, this.height, {
      format: FORMATS.LUMINANCE_ALPHA,
      type: TYPES.UNSIGNED_BYTE,
    });
  }
}
