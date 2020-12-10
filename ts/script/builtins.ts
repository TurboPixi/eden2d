import { Frame, KNative, KDef, KLet, EDef, KSet } from "./script";
import { Chunk, ChunkId } from "../chunk";
import { entChunk, Entity, EntityId, EntityType, Var } from "../entity";
import { World } from "../world";

export const New = "new";
export const Move = "move";
export const Jump = "jump";

export const Portal = "portal";

export const builtins: EDef[] = [
  [KDef, Portal, ['type', 'from', 'fx', 'fy', 'to', 'tx', 'ty'], [
    [KLet, { ent: [New, { chunk: ['from'], type: ['type'], x: ['fx'], y: ['fy'] }] }, [
      [Jump, { ent: ['ent'], x: ['fx'], y: ['fy'] }],
      [KSet, ['ent'], Var.PortalChunk, ['to']],
      [KSet, ['ent'], Var.PortalX, ['tx']],
      [KSet, ['ent'], Var.PortalY, ['ty']],
    ]]]],

  [KDef, New, ['chunk', 'type', 'x', 'y'],
    [KNative, function (world: World, frame: Frame): EntityId {
      let chunkId = frame['chunk'] as number;
      let type = frame['type'] as EntityType;
      let x = frame['x'] as number;
      let y = frame['y'] as number;

      let chunk = world.chunk(chunkId);
      let ent = new Entity(type);
      return chunk.addEntity(ent, x, y);
    }]],

  [KDef, Move, ['ent', 'dx', 'dy'],
    [KNative, function (world: World, frame: Frame): void {
      let entId = frame['ent'] as EntityId;
      let dx = frame['dx'] as number;
      let dy = frame['dy'] as number;

      let chunkId = entChunk(entId);
      let chunk = world.chunk(chunkId);
      let ent = chunk.entity(entId);
      ent.move(ent.x + dx, ent.y + dy);
    }]],

  [KDef, Jump, ['ent', 'chunk', 'x', 'y'],
    [KNative, function (world: World, frame: Frame): EntityId {
      let entId = frame['ent'] as EntityId;
      let toId = frame['chunk'] as ChunkId;
      let x = frame['x'] as number;
      let y = frame['y'] as number;

      let fromId = entChunk(entId);
      let from = world.chunk(fromId);
      let ent = from.entity(entId);
      let to = world.chunk(toId);
      return to.addEntity(ent, x, y);
    }]],
];

export function topWithVar(chunk: Chunk, boolVar: Var, x: number, y: number): Entity {
  let ents = chunk.entitiesAt(x, y);
  for (var ent of ents) {
    if (ent.getVar(boolVar) !== undefined) {
      return ent;
    }
  }
  return null;
}
