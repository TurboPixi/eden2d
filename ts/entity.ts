import { Chunk, locChunk } from "./chunk";
import { Located } from "./components/located";
import { Rendered } from "./components/rendered";
import { IDict, Dict, dictParent, dictRef, _root, isDict } from "./script/dict";
import { $, chuck, EDict, EExpr, ESym, symName, _, _blk, _def, _parent, _parentTag, _set } from "./script/script";
import { lookupSym, envEval } from "./script/env";
import { _parse } from "./script/parse";

export class Entity implements IDict {
  static Dict = {
    'jump': [$('chunk'), _blk, (env: Dict) => {
      let self = locEnt(env, $('@'));
      let to = locChunk(env, $('chunk'));
      to.addEntity(self);
      return self;
    }],

    'move': _parse('Entity:move', `[dx dy |
      @:move-to [+ @:loc:x dx] [+ @:loc:y dy]
    ]`),

    'move-to': _parse('Entity:move-to', `[x y |
      set @:loc {x y}
    ]`),

    'top-with': _parse('Entity:top-with', `[comp |
      @:chunk:top-with @:loc:x @:loc:y comp
    ]`),

    'near-with': _parse('Entity:near-with', `[comp |
      @:chunk:near-with @:loc:x @:loc:y comp
    ]`),

    'prepare': _parse('Entity:prepare', `[action |
      for-each-entry @:comps [name comp |
        if [? comp :prepare] (
          comp:prepare @ action
        )
      ]
    ]`),

    'perform': _parse('Entity:perform', `[action |
      for-each-entry @:comps [name comp |
        if [? comp :perform] (
          comp:perform @ action
        )
      ]
    ]`)
  };

  private _chunk: Chunk;
  private _id: number;
  private _parent: EExpr;
  private _comps: EDict = {};

  constructor(env: Dict) {
    this._parent = lookupSym(env, $('Entity'));
  }

  get id(): number { return this._id }
  get chunk(): Chunk { return this._chunk }
  get names(): string[] { return ['id', 'chunk', symName(_parentTag)]; }

  exists(sym: ESym): boolean {
    let name = symName(sym);
    switch (name) {
      case 'chunk':
      case 'id':
      case 'comps':
        return true;
    }
    return name in this._comps;
  }

  ref(sym: ESym): EExpr {
    let name = symName(sym);
    switch (name) {
      case 'chunk': return this._chunk;
      case 'id': return this._id;
      case 'comps': return this._comps;
      case symName(_parentTag): return this._parent;
    }
    return this._comps[name];
  }

  def(sym: ESym, value: EExpr): void {
    let name = symName(sym);
    switch (name) {
      case 'chunk':
      case 'id':
      case 'comps':
      case symName(_parentTag):
        // TODO: Pass env to def/ref?
        chuck(_root, `can't set ${symName(sym)} on Entity`);
    }
    this._comps[name] = value;
  }

  hasComp(key: ESym): boolean { return symName(key) in this._comps; }

  // Accessors for common component types.
  get loc(): Located { return this.ref($('loc')) as Located }
  get rendered(): Rendered { return this.ref($('rendered')) as Rendered }

  setChunkAndId(chunk: Chunk, id: number) {
    this._chunk = chunk;
    this._id = id;
  }
}

// Convenience env implementation for simple components.
// TODO: add type checking and read-only semantics?
export class NativeComp implements IDict {

  get names(): string[] {
    return Object.getOwnPropertyNames(this);
  }

  exists(sym: ESym): boolean {
    return symName(sym) in this;
  }

  ref(sym: ESym): EExpr {
    let name = symName(sym);
    return (this as any)[name];
  }

  def(sym: ESym, value: EExpr): void {
    let name = symName(sym);
    (this as any)[name] = value;
  }
}

export function isEntity(expr: EExpr): Entity {
  let env = isDict(expr);
  while (env) {
    if (env instanceof Entity) {
      return expr as Entity;
    }
    env = dictParent(env);
  }
  return undefined;
}

export function locEnt(env: Dict, sym: ESym): Entity {
  let ent = isEntity(envEval(env, sym));
  if (ent === undefined) {
    chuck(env, `${name}: ${dictRef(env, sym)} is not an entity`);
  }
  return ent as Entity;
}
