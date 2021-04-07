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
import { Located } from "./components/located";
import { Rendered } from "./components/rendered";
import { Chunk } from "./chunk";

import components_kurt from "./components/components.kurt";
import actions_kurt from "./actions/actions.kurt";
import player_kurt from "./actors/player.kurt";
import blocks_kurt from "./blocks/blocks.kurt";
import door_key_kurt from "./blocks/door-key.kurt";
import items_kurt from "./items/items.kurt";

import test_kurt from "./script/test/test.kurt";
import ui_kurt from "./ui/ui.kurt";

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
_eval(_root, _parse('test.kurt', test_kurt)); // language tests

// TODO: It's kind of gross to have to initialize all the scripts this way.
// May need some more generalized mechanism for importing.
_eval(_root, [_def, {
  'World': World.inst,
  'Chunk': Chunk.Dict,
  'Entity': Entity.Dict,
  'Located': Located.Dict,
  'Rendered': Rendered.Dict,
}]);
_eval(_root, _parse('components.kurt', components_kurt));
_eval(_root, _parse('actions.kurt', actions_kurt));
_eval(_root, _parse('player.kurt', player_kurt));
_eval(_root, _parse('blocks.kurt', blocks_kurt));
_eval(_root, _parse('door-key.kurt', door_key_kurt));
_eval(_root, _parse('items.kurt', items_kurt));
_eval(_root, _parse('ui.kurt', ui_kurt));

// Start the game.
new Eden();
