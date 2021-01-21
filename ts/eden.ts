import { Application, Container } from "pixi.js";
import { Resources } from "./res";
import { _eval } from "./script/eval";
import { _print } from "./script/print";
import { _root } from "./script/scope";
import { _blk, _def, _do } from "./script/script";
import { World } from "./world";
import { builtins } from "./script/builtins";
import { UI } from "./ui";
import { WorldPanel } from "./worldpanel";
import { runTests } from "./test";
import { parse } from "./script/kurt";

export interface PanelOwner {
  readonly world: World;
  showPanel(panel: Panel): void;
  popPanel(): void;
}

export interface Panel { 
  tick(): void;
  keyDown(evt: KeyboardEvent): void;
  readonly container: Container;
}

class Eden implements PanelOwner {
  private _app: Application;
  private _world: World;
  private _ui: UI;
  private _panels: Panel[] = [];

  constructor() {
    this._app = new Application({ backgroundColor: 0x1099bb });
    this._app.resizeTo = window;
    document.body.appendChild(this._app.view);
    document.addEventListener('keydown', (evt) => this.topPanel?.keyDown(evt), true);

    Resources.load(() => this.ready());
  }

  get world(): World {
    return this._world;
  }

  showPanel(panel: Panel) {
    this._panels.push(panel);
    this._app.stage.addChild(panel.container);
  }

  popPanel(): void {
    // Don't pop the last panel.
    if (this._panels.length > 1) {
      this._app.stage.removeChild(this.topPanel.container);
      this._panels.pop();
    }
  }

  get topPanel(): Panel {
    return this._panels[this._panels.length - 1];
  }

  private ready() {
    this._world = new World();
    this._ui = new UI(this._world);

    this.showPanel(new WorldPanel(this));
    this._app.stage.interactive = true;
    this._app.ticker.add(() => this.tick())
    this._app.start();
  }

  private tick(): void {
    for (let panel of this._panels) {
      panel.tick();
    }
  }
}

_eval(_root, builtins);
new Eden();
// runTests();
