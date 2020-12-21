import { EExpr, EVal, evaluate, Scope, ScopeType, _, _func, _let, _self, _set } from "./script/script";
import { Chunk, ChunkId } from "./chunk";
import { EntityType, Var } from "./entity";
import { _move, _new } from "./script/builtins";

// TODO: Reliable garbage-collection on chunks.
export class World implements Scope {
  private _chunks: { [id: number]: Chunk } = {};
  private _nextId: ChunkId = 1;
  private _defs: { [name: string]: EVal } = {};

  constructor() {
    this.funcs();
  }

  get type(): ScopeType { return ScopeType.WORLD }
  get name(): string { return "[world]" }
  get self(): EVal { return this }
  get parent(): Scope { return null }
  get world(): World { return this }
  get names(): string[] { return this._defs ? Object.keys(this._defs) : [] }
  ref(name: string): EVal { return this._defs[name] }
  def(name: string, value: EVal): void { this._defs[name] = value }

  newChunk(): Chunk {
    let id = this._nextId++;
    this._chunks[id] = new Chunk(this, id);
    return this._chunks[id];
  }

  chunk(id: ChunkId): Chunk {
    return this._chunks[id];
  }

  toyChunk(): Chunk {
    let chunk = this.newChunk();

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        evaluate(this, [_move, [_new, chunk, EntityType.TileBlue], x, y]);
      }
    }

    for (let x = 1; x < 9; x++) {
      evaluate(this, [_move, [_new, chunk, EntityType.WallBlue], x, 0]);
    }

    return chunk;
  }

  private funcs() {
    evaluate(this,
      [_set, _self, 'portal', [_func, ['type', 'from', 'fx', 'fy', 'to', 'tx', 'ty'],
        [_let, { ent: [_new, _('from'), _('type')] },
          [_move, _('ent'), _('fx'), _('fy')],
          [_set, _('ent'), Var.PortalChunk, _('to')],
          [_set, _('ent'), Var.PortalX, _('tx')],
          [_set, _('ent'), Var.PortalY, _('ty')],
          _('ent')
        ]
      ]]
    );
  }
}

export function isWorld(expr: EExpr): World {
  if (expr instanceof World) {
    return expr as World;
  }
  return undefined;
}
