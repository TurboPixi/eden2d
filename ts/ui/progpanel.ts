import { Container, Graphics } from "pixi.js";
import { Chunk, locChunk } from "../chunk";
import { Panel, PanelOwner } from "../eden";
import { Key } from "./key";
import { _eval } from "../script/eval";
import { $, $$, EExpr, ESym, nil, symName, _, _blk } from "../script/script";
import { Dict, isDict, _root } from "../script/dict";

import containerpanel_kurt from "./progpanel.kurt";
import { _parse } from "../script/parse";
import { parse } from "../script/kurt";

export class ProgPanel implements Panel {
  private _container: Container;
  private _progChunk: Chunk;
  private _impl: Dict;

  constructor(programmed: EExpr, private _owner: PanelOwner) {
    _eval(_root, _parse('progpanel.kurt', containerpanel_kurt)); // TODO: Do this only once.

    this._progChunk = _eval(_root, [_(programmed), $$('program-chunk')]) as Chunk;

    this._container = new Container();
    this._container.setTransform(64 * 4, 64 * 4);

    this._impl = isDict(_eval(_root, [[$('ProgPanel'), $$('make')], _(programmed), 10, 10,
    [$('chunk'), _blk, (env: Dict) => this.parser(env, locChunk(env, $('chunk')))]
    ]));

    let bg = new Graphics();
    bg.beginFill(0, 0.5);
    bg.drawRect(0, 0, 16 * 10 * 4, 16 * 10 * 4);
    bg.endFill();
    this._container.addChild(bg);
    this._container.addChild(this._progChunk.container);
  }

  get container(): Container {
    return this._container;
  }

  tick(deltaMillis: number): void {
    this._progChunk.render(0, 0, 4);
  }

  // [user target | user:chunk:perform [action-ignite user target]]
  private parser(env: Dict, chunk: Chunk): EExpr {
    interface Cell {
      sym?: ESym;
      quote?: boolean;
      open?: boolean;
      close?: boolean;
      period?: boolean;
    }

    let x = 0, y = 0, dir = false;
    let stack: Cell[] = [{}];

    function top(): Cell {
      return stack[stack.length-1];
    }

    function sym(name: string) {
      if (top().sym !== nil) {
        throw `two syms found at ${x},${y}`;
      }
      top().sym = $(name);
    }

    // TODO: Define the syntax and parse it.
    let src = "nil";
    // while (true) {
    //   let glyphs = chunk.entitiesWith(x, y, $('glyph'));
    //   for (let glyph of glyphs) {
    //     let type = symName(expectSym(env, _eval(env, [[_(glyph), $$('glyph')], $$('type')])));
    //     switch (type) {
    //       case 'square-open-horz': top().open = true; break;
    //       case 'square-close-horz': top().close = true; break;
    //       case 'quote-horz': top().quote = true; break;
    //       case 'period-horz': top().period = true; break;
    //       case 'block-horz': sym('|'); break;
    //       case 'user': sym('user'); break;
    //       case 'chunk': sym('chunk'); break;
    //       case 'perform': sym('perform'); break;
    //       case 'ignite': sym('action-ignite'); break;
    //       case 'target': sym('target'); break;
    //     }
    //   }
    //   // ...
    //   if (dir) { y++; }
    //   else { x++; }
    // }

    return _eval(env, parse(`[user target | ${src}]`));
  }

  keyDown(evt: KeyboardEvent): void {
    let writeType: EExpr = nil;

    switch (evt.keyCode) {
      case Key.UP: this.call('move-cursor', 0, -1); break;
      case Key.DOWN: this.call('move-cursor', 0, 1); break;
      case Key.LEFT: this.call('move-cursor', -1, 0); break;
      case Key.RIGHT: this.call('move-cursor', 1, 0); break;
      case Key.BACKSPACE: this.call('erase'); break;

      case Key.U: writeType = $$('user'); break;
      case Key.C: writeType = $$('chunk'); break;
      case Key.P: writeType = $$('perform'); break;
      case Key.I: writeType = $$('ignite'); break;
      case Key.T: writeType = $$('target'); break;

      case Key.SPACE:
        if (evt.shiftKey) {
          this.call('move-cursor', -1, 0);
        } else {
          this.call('move-cursor', 1, 0);
        }
        break;

      case Key.ENTER:
        if (evt.shiftKey) {
          this.call('move-cursor', 0, -1);
        } else {
          this.call('move-cursor', 0, 1);
        }
        break;

      case Key.PERIOD:
        if (evt.ctrlKey) writeType = $$('period-vert');
        else writeType = $$('period-horz');
        break;

      case Key.BACK_SLASH:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('block-vert');
          else writeType = $$('block-horz');
        }
        break;

      case Key.SEMI_COLON:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('quote-vert');
          else writeType = $$('quote-horz');
        }
        break;

      case Key._9:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('round-open-vert');
          else writeType = $$('round-open-horz');
        }
        break;

      case Key._0:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('round-close-vert');
          else writeType = $$('round-close-horz');
        }
        break;

      case Key.OPEN_BRACKET:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('curly-open-vert');
          else writeType = $$('curly-open-horz');
        } else {
          if (evt.ctrlKey) writeType = $$('square-open-vert');
          else writeType = $$('square-open-horz');
        }
        break;

      case Key.CLOSE_BRACKET:
        if (evt.shiftKey) {
          if (evt.ctrlKey) writeType = $$('curly-close-vert');
          else writeType = $$('curly-close-horz');
        } else {
          if (evt.ctrlKey) writeType = $$('square-close-vert');
          else writeType = $$('square-close-horz');
        }
        break;

      case Key.ESCAPE:
        this._owner.popPanel();
        this.call('close');
        break;
    }

    if (writeType !== nil) {
      this.call('write', writeType);
    }
  }

  private call(blockName: string, ...expr: EExpr[]): EExpr {
    return _eval(_root, [[_(this._impl), $$(blockName)], ...expr]);
  }
}
