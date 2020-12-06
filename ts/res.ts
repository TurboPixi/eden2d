import { Loader, Spritesheet, SpritesheetLoader } from "pixi.js";

export enum ResourceKey {
  Tiles = "tiles",
  Player = "player",
}

const ResMap: {[key: string]: string} = {
  "tiles": "rogue/environment.png",
  "player": "rogue/player0.png",
};

export class Resources {

  constructor(done: () => void) {
    let loader = new Loader("images/");
    for (let key in ResMap) {
      loader.add(key, ResMap[key]);
    }
    loader.load(done);
  }
}
