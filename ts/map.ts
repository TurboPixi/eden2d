import {
  Application,
  BaseTexture,
  Container,
  Geometry,
  Loader,
  Mesh,
  MIPMAP_MODES,
  SCALE_MODES,
  Shader,
  Texture
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

export class Map {
  private container: Container;
  private shader: Shader;
  private x: number;
  private y: number;
  private mapWidth: number;
  private mapHeight: number;

  constructor(private app: Application) {
    this.container = new Container();
    this.app.stage.addChild(this.container);

    this.x = 128;
    this.y = 128;

    new Loader("images/")
      .add('tiles', 'rogue/environment.png')
      .load(() => this.loaded());
  }

  private loaded() {
    const tiles = Texture.from("tiles");

    tiles.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    tiles.baseTexture.mipmap = MIPMAP_MODES.OFF;

    this.mapWidth = this.mapHeight = 16;
    const mapData = [
      [
        [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4],
        [4, 4], [0, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [4, 4],
        [4, 4], [0, 2], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0], [5, 0],
      ]
    ];
    const map = BaseTexture.fromBuffer(parseMap(mapData), this.mapWidth, this.mapHeight);

    this.shader = Shader.from(vert, frag, {
      map,
      tiles,
      tileSize: [16, 16],
      mapSize: [this.mapWidth, this.mapHeight],
      view: [0, 0, 0, 0]
    })

    const geometry = new Geometry().addAttribute('position', [
      -1, -1, 1, -1, -1, 1,
      1, 1, -1, 1, 1, -1
    ]);
    const tileMesh = new Mesh(geometry, this.shader);
    this.app.stage.addChild(tileMesh);
  }

  tick() {
    if (this.shader) {
      const boxX = this.mapWidth * this.x / this.app.screen.width;
      const boxY = this.mapHeight * this.y / this.app.screen.height;
      const boxH = 8;
      const boxW = this.app.screen.width / this.app.screen.height * boxH;

      this.shader.uniforms.view = [
        boxX - 0.5 * boxW,
        boxY - 0.5 * boxH,
        boxX + 0.5 * boxW,
        boxY + 0.5 * boxH
      ];
    }
  }
}

function parseMap(map: number[][][]): Uint8Array {
  var data = [];
  let count = 0;

  for (var i = 0; i < map.length; i++) {
    for (var j = 0; j < map[i].length; j++) {
      data[count++] = map[i][j][0];
      data[count++] = 0
      data[count++] = 0;
      data[count++] = map[i][j][1];
    }
  }

  return new Uint8Array(data)
}
