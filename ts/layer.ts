import {
  BaseTexture,
  Container,
  FORMATS,
  Geometry,
  Loader,
  Mesh,
  MIPMAP_MODES,
  SCALE_MODES,
  Shader,
  Texture,
  TYPES
} from "pixi.js";

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

export abstract class Layer {
  private shader: Shader;
  private buf: Uint8Array;
  private dirty = false;

  constructor(container: Container, private width: number, private height: number, private img: string, tileWidth: number, tileHeight: number) {
    const blank = Texture.fromBuffer(new Uint8Array(4), 1, 1);

    this.buf = new Uint8Array(width * height * 2);
    const map = BaseTexture.fromBuffer(this.buf, width, height, {
      format: FORMATS.LUMINANCE_ALPHA,
      type: TYPES.UNSIGNED_BYTE,
    });

    this.shader = Shader.from(vert, frag, {
      map: this.mapTex(),
      tiles: blank,
      tileSize: [tileWidth, tileHeight],
      mapSize: [width, height],
      view: [0, 0, 0, 0]
    })

    const geometry = new Geometry().addAttribute('position', [
      -1, -1, 1,
      -1, -1, 1,
      1, 1, -1,
      1, 1, -1
    ]);
    const tileMesh = new Mesh(geometry, this.shader);
    container.addChild(tileMesh);

    new Loader("images/").add(img, img).load(() => this.loaded());
  }

  setTile(x: number, y: number, t: number) {
    let u = t & 0xf, v = t >> 4;
    const idx = (y * this.width + x) * 2;
    this.buf[idx] = u;
    this.buf[idx + 1] = v;
    this.dirty = true;
  }

  private mapTex(): BaseTexture {
    return BaseTexture.fromBuffer(this.buf, this.width, this.height, {
      format: FORMATS.LUMINANCE_ALPHA,
      type: TYPES.UNSIGNED_BYTE,
    });
  }

  private loaded() {
    const tiles = Texture.from(this.img);

    tiles.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    tiles.baseTexture.mipmap = MIPMAP_MODES.OFF;

    this.shader.uniforms.tiles = tiles;
  }

  tick(x: number, y: number, w: number, h: number) {
    if (this.dirty) {
      this.shader.uniforms.map = this.mapTex();
      this.dirty = false;
    }

    const boxX = this.width * x / w;
    const boxY = this.height * y / h;
    const boxH = 16;
    const boxW = w / h * boxH;

    this.shader.uniforms.view = [
      boxX - 0.5 * boxW,
      boxY - 0.5 * boxH,
      boxX + 0.5 * boxW,
      boxY + 0.5 * boxH
    ];
  }
}

function tile(u: number, v: number): number {
  return v * 16 + u;
}

// Ground

export enum GroundTile {
  Empty = tile(4, 4),
  WallBlue0 = tile(4, 1),
  TileBlue0 = tile(5, 0),
}

export class GroundLayer extends Layer {

  constructor(container: Container, width: number, height: number) {
    super(container, width, height, "rogue/environment.png", 16, 16);
  }

  setTile(x: number, y: number, t: GroundTile) {
    super.setTile(x, y, t);
  }
}

// Things

export enum ThingTile {
  Empty = tile(4, 4),
  ChestClosedLocked = tile(0, 12),
}

export class ThingLayer extends Layer {

  constructor(container: Container, width: number, height: number) {
    super(container, width, height, "rogue/environment.png", 16, 16);
  }

  setTile(x: number, y: number, t: ThingTile) {
    super.setTile(x, y, t);
  }
}

// Actors

export enum ActorTile {
  Empty = tile(0, 0),
  Player0 = tile(1, 0),
}

export class ActorLayer extends Layer {

  constructor(container: Container, width: number, height: number) {
    super(container, width, height, "rogue/player0.png", 16, 16);
  }

  setTile(x: number, y: number, t: ActorTile) {
    super.setTile(x, y, t);
  }
}
