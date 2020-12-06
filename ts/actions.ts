import { Entity, EntityId, EntityType } from "./entity";
import { Map } from "./map";

export enum ActionType {
  Create = 0, // [ent-type, x, y]
  Move = 1,   // [ent-id, dx, dy]
}

export interface Action {
  type: ActionType;
  actor: EntityId;
  args: any[];
}

export function actCreate(actor: EntityId, type: EntityType, x: number, y: number): Action {
  return {
    type: ActionType.Create,
    actor: actor,
    args: [type, x, y]
  }
}

export function actMove(actor: EntityId, target: EntityId, dx: number, dy: number): Action {
  return {
    type: ActionType.Move,
    actor: actor,
    args: [target, dx, dy]
  }
}

export class Actions {

  private constructor() { }

  static eval(map: Map, action: Action): EntityId {
    switch (action.type) {
      case ActionType.Create: {
        let entType = action.args[0] as EntityType;
        let x = action.args[1] as number;
        let y = action.args[2] as number;
        let ent = new Entity(entType);
        map.addEntity(ent, x, y);
        return ent.id;
      }

      case ActionType.Move: {
        let entId = action.args[0] as EntityId;
        let dx = action.args[1] as number;
        let dy = action.args[2] as number;
        let ent = map.entity(entId);
        ent.move(ent.x + dx, ent.y + dy);
        break;
      }
    }

    return EntityId.Unknown;
  }
}
