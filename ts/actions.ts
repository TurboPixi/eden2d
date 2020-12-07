import { Entity, EntityId, EntityType } from "./entity";
import { ChunkId } from "./chunk";
import { World } from "./world";

export enum ActionType {
  Create = 0,   // [chunk, ent-type, x, y]
  Move = 1,     // [chunk, ent, dx, dy]
  Transfer = 2, // [from, ent, to, x, y]
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

export class Actions {

  private constructor() { }

  static eval(world: World, action: Action): EntityId {
    switch (action.type) {
      case ActionType.Create: {
        let chunkId = action.args[0] as ChunkId;
        let entType = action.args[1] as EntityType;
        let x = action.args[2] as number;
        let y = action.args[3] as number;

        let chunk = world.chunk(chunkId);
        let ent = new Entity(entType);
        chunk.addEntity(ent, x, y);
        return ent.id;
      }

      case ActionType.Move: {
        let chunkId = action.args[0] as ChunkId;
        let entId = action.args[1] as EntityId;
        let dx = action.args[2] as number;
        let dy = action.args[3] as number;

        let chunk = world.chunk(chunkId);
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

        let from = world.chunk(fromId);
        let ent = from.entity(entId);
        let to = world.chunk(toId);
        to.addEntity(ent, x, y);
        break;
      }
    }

    return EntityId.Unknown;
  }
}
