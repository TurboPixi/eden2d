import { Frame, EDef } from "./script";
import { Chunk, ChunkId } from "../chunk";
import { entChunk, Entity, EntityId, EntityType, Var } from "../entity";
import { World } from "../world";

export const builtins: EDef[] = [

  ['def', 'new', ['chunk', 'type'],
    ['native', (world, frame) => {
      let chunk = world.chunk(frame['chunk'] as number);
      let ent = new Entity(frame['type'] as EntityType);
      return chunk.addEntity(ent);
    }]],

  ['def', 'move', ['ent', 'x', 'y'],
    ['native', (world, frame) => {
      let entId = frame['ent'] as EntityId;
      let x = frame['x'] as number;
      let y = frame['y'] as number;

      let chunkId = entChunk(entId);
      let chunk = world.chunk(chunkId);
      let ent = chunk.entity(entId);
      ent.move(x, y);
    }]],

  ['def', 'jump', ['ent', 'chunk'],
    ['native', (world, frame) => {
      let entId = frame['ent'] as EntityId;
      let toId = frame['chunk'] as ChunkId;

      let fromId = entChunk(entId);
      let from = world.chunk(fromId);
      let ent = from.entity(entId);
      let to = world.chunk(toId);
      entId = to.addEntity(ent);
      return entId;
    }]],

  ['def', 'topWithVar', ['chunk', 'x', 'y', 'var'], [
    'native', (world, frame) => {
      let chunkId = frame['chunk'] as number;
      let x = frame['x'] as number;
      let y = frame['y'] as number;
      let v = frame['var'] as string;
      let chunk = world.chunk(chunkId);
      let ents = chunk.entitiesAt(x, y);
      for (var ent of ents) {
        if (ent.getVar(v as Var) !== undefined) {
          return ent.id;
        }
      }
      return undefined;
    }
  ]],

  ['def', 'portal', ['type', 'from', 'fx', 'fy', 'to', 'tx', 'ty'], [
    ['let', { ent: ['new', { chunk: ['from'], type: ['type'] }] }, [
      ['move', { ent: ['ent'], x: ['fx'], y: ['fy'] }],
      ['set', ['ent'], Var.PortalChunk, ['to']],
      ['set', ['ent'], Var.PortalX, ['tx']],
      ['set', ['ent'], Var.PortalY, ['ty']],
      ['ent']
    ]]]],
];
