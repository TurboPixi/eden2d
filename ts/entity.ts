import { Chunk, locChunk } from "./chunk";
import { Loc } from "./loc";
import { Render } from "./render";
import { parse } from "./script/kurt";
import { IDict, Dict, dictParent, dictRef, _root, isDict } from "./script/dict";
import { $, chuck, EDict, EExpr, ESym, nil, symName, _, _blk, _def, _parent, _parentTag, _set } from "./script/script";
import { lookupSym, envEval } from "./script/env";

export let EntityClass = [_def, { 'Entity': {
  'jump': [$('chunk'), _blk, (env: Dict) => {
    let self = locEnt(env, $('@'));
    let to = locChunk(env, $('chunk'));
    to.addEntity(self);
    return self;
  }],

  'move': parse(`[dx dy | do
    [def {loc = @:loc}]
    [@:move-to [+ loc:x dx] [+ loc:y dy]]
  ]`),

  'move-to': parse(`[x y | do
    [def {loc = @:loc}]
    [set loc {x = x}]
    [set loc {y = y}]
  ]`),

  'top-with': parse(`[comp | do
    [def {loc = @:loc}]
    [@:chunk:top-with loc:x loc:y comp]
  ]`),
}}];

export class Entity implements IDict {
  private _chunk: Chunk;
  private _id: number;
  private _comps: EDict = {};
  private _parent: EExpr;

  constructor(env: Dict) {
    this._parent = lookupSym(env, $('Entity'));
  }

  get id(): number { return this._id }
  get chunk(): Chunk { return this._chunk }
  get names(): string[] { return ['id', 'chunk', symName(_parentTag)]; }

  def(sym: ESym, value: EExpr): void {
    let name = symName(sym);
    switch (name) {
      case 'chunk':
      case 'id':
      case symName(_parentTag):
        // TODO: Pass env to def/ref?
        chuck(_root, `can't set ${symName(sym)} on Entity`);
    }
    this._comps[name] = value;
  }

  ref(sym: ESym): EExpr {
    let name = symName(sym);
    switch (name) {
      case 'chunk': return this._chunk;
      case 'id': return this._id;
      case symName(_parentTag): return this._parent;
    }
    return this._comps[name];
  }

  hasComp(key: ESym): boolean { return symName(key) in this._comps; }

  // Accessors for common component types.
  loc(): Loc { return this.ref($('loc')) as Loc }
  render(): Render { return this.ref($('render')) as Render }

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

  ref(sym: ESym): EExpr {
    let name = symName(sym);
    if (this.hasOwnProperty(name)) {
      return (this as any)[name];
    }
    return nil;
  }

  def(sym: ESym, value: EExpr): void {
    let name = symName(sym);
    if (this.hasOwnProperty(name)) {
      (this as any)[name] = value;
      return;
    }
    chuck(_root, `unknown property ${name}`);
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
