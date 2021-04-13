import { Application, Container } from "pixi.js";
import { Resources } from "./res";
import { _eval } from "./script/eval";
import { _print } from "./script/print";
import { _root } from "./script/dict";
import { _blk, _def, _do } from "./script/script";
import { World } from "./world";
import { builtinDefs } from "./script/builtins";
import { WorldPanel } from "./ui/worldpanel";
import { _parse } from "./script/parse";
import { Entity } from "./entity";
import { Chunk } from "./chunk";
import { nsBlocks } from "./blocks/blocks";
import { nsItems } from "./items/items";
import { nsActors } from "./actors/actors";
import { nsComps } from "./comps/comps";
import { nsUI } from "./ui/ui";
import { nsActions } from "./actions/actions";

export interface PanelOwner {
  showPanel(panel: Panel): void;
  popPanel(): void;
}

export interface Panel { 
  tick(deltaMillis: number): void;
  keyDown(evt: KeyboardEvent): void;
  readonly container: Container;
}

class Eden implements PanelOwner {
  private _app: Application;
  private _panels: Panel[] = [];

  constructor() {
    this._app = new Application({ backgroundColor: 0x1099bb });
    this._app.resizeTo = window;
    document.body.appendChild(this._app.view);
    document.addEventListener('keydown', (evt) => this.topPanel?.keyDown(evt), true);

    Resources.load(() => this.ready());
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
    this.showPanel(new WorldPanel(this));
    this._app.stage.interactive = true;
    this._app.ticker.add(() => this.tick(this._app.ticker.deltaMS))
    this._app.start();
  }

  private tick(deltaMillis: number): void {
    for (let panel of this._panels) {
      panel.tick(deltaMillis);
    }
  }
}

// Init builtins.
_eval(_root, builtinDefs);

// Run language tests.
import test_kurt from "./script/test/test.kurt";
_eval(_root, _parse('test.kurt', test_kurt)); // language tests

// Eval the native implementations.
_eval(_root, [_def, {
  'World': World.inst,
  'Chunk': Chunk.Dict,
  'Entity': Entity.Dict,
}]);

// And various namespaces.
nsComps();
nsBlocks();
nsItems();
nsActors();
nsUI();
nsActions();

// Start the game.
new Eden();
