import { Entity, EntityId, EntityType, Var } from "./entity";
import { Chunk, ChunkId } from "./chunk";
import { World } from "./world";

export enum ActionType {
  Create = 0,   // (chunk, ent-type, x, y) => ent
  Move = 1,     // (chunk, ent, dx, dy)
  Transfer = 2, // (from, ent, to, x, y)
}

export interface Action {
  type: ActionType;
  actor: EntityId;
  args: any[];
}

export function actCreate(actor: EntityId, chunk: ChunkId, type: EntityType, x: number, y: number): Action {
  return {
    type: ActionType.Create,
    actor: actor,
    args: [chunk, type, x, y]
  }
}

export function actMove(actor: EntityId, chunk: ChunkId, target: EntityId, dx: number, dy: number): Action {
  return {
    type: ActionType.Move,
    actor: actor,
    args: [chunk, target, dx, dy]
  }
}

export function actTransfer(actor: EntityId, from: ChunkId, target: EntityId, to: ChunkId, x: number, y: number): Action {
  return {
    type: ActionType.Transfer,
    actor: actor,
    args: [from, target, to, x, y]
  }
}

interface Rule {
  eval(action: Action): Action;
}

export class Actions {
  private _rules: Rule[] = [];

  constructor(private _world: World) { }

  addRules(rule: Rule) {
    this._rules.push(rule);
  }

  eval(action: Action): any {
    for (var rule of this._rules) {
      action = rule.eval(action);
    }
    return this.exec(action);
  }

  private exec(action: Action): any {
    switch (action.type) {
      case ActionType.Create: {
        let chunkId = action.args[0] as ChunkId;
        let entType = action.args[1] as EntityType;
        let x = action.args[2] as number;
        let y = action.args[3] as number;

        let chunk = this._world.chunk(chunkId);
        let ent = new Entity(entType);
        chunk.addEntity(ent, x, y);
        return ent.id;
      }

      case ActionType.Move: {
        let chunkId = action.args[0] as ChunkId;
        let entId = action.args[1] as EntityId;
        let dx = action.args[2] as number;
        let dy = action.args[3] as number;

        let chunk = this._world.chunk(chunkId);
        let ent = chunk.entity(entId);
        ent.move(ent.x + dx, ent.y + dy);
        break;
      }

      case ActionType.Transfer: {
        let fromId = action.args[0] as ChunkId;
        let entId = action.args[1] as EntityId;
        let toId = action.args[2] as ChunkId;
        let x = action.args[3] as number;
        let y = action.args[4] as number;

        let from = this._world.chunk(fromId);
        let ent = from.entity(entId);
        let to = this._world.chunk(toId);
        to.addEntity(ent, x, y);
        break;
      }
    }
  }
}

export function portal(world: World, type: EntityType, fromId: ChunkId, fx: number, fy: number, toId: ChunkId, tx: number, ty: number) {
  let from = world.chunk(fromId);
  let entId = world.eval(actCreate(EntityId.System, fromId, type, fx, fy)) as EntityId;
  let ent = from.entity(entId);
  ent.setChunk(Var.PortalChunk, toId);
  ent.setNum(Var.PortalX, tx);
  ent.setNum(Var.PortalY, ty);
}

export function topWithVar(chunk: Chunk, boolVar: Var, x: number, y: number): Entity {
  let ents = chunk.entitiesAt(x, y);
  for (var ent of ents) {
    if (ent.getBool(boolVar)) {
      return ent;
    }
  }
  return null;
}
