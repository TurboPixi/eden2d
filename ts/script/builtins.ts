import { EDef, Frame } from "./script";
import { Chunk, ChunkId } from "../chunk";
import { entChunk, Entity, EntityId, EntityType, Var } from "../entity";
import { World } from "../world";

export const builtins: EDef[] = [
  ['def', 'newChunk', [], [
    'native', (world, frame) => {
      return world.newChunk().id;
    }
  ]],

  ['def', 'new', ['chunk', 'type'], [
    'native', (world, frame) => {
      let chunk = locChunk(world, frame, 'chunk');
      let ent = new Entity(locStr(frame, 'type') as EntityType);
      return chunk.addEntity(ent);
    }
  ]],

  ['def', 'move', ['ent', 'x', 'y'], [
    'native', (world, frame) => {
      let x = locNum(frame, 'x');
      let y = locNum(frame, 'y');
      let [ent, _] = locEnt(world, frame, 'ent');
      ent.move(x, y);
    }
  ]],

  ['def', 'jump', ['ent', 'chunk'], [
    'native', (world, frame) => {
      let [ent, from] = locEnt(world, frame, 'ent');
      let to = locChunk(world, frame, 'chunk');
      return to.addEntity(ent);
    }
  ]],

  ['def', 'topWithVar', ['chunk', 'x', 'y', 'var'], [
    'native', (world, frame) => {
      let chunk = locChunk(world, frame, 'chunk');
      let x = locNum(frame, 'x');
      let y = locNum(frame, 'y');
      let v = locStr(frame, 'var');
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
    ]]
  ]],
];

function locNum(frame: Frame, name: string): number {
  let value = frame.args[name] as number;
  if (typeof value != "number") {
    throw new Error(`${name}: ${value} is not a number`);
  }
  return value;
}

function locStr(frame: Frame, name: string): string {
  let value = frame.args[name] as string;
  if (typeof value != "string") {
    throw new Error(`${name}: ${value} is not a string`);
  }
  return value;
}

function locChunk(world: World, frame: Frame, name: string): Chunk {
  let chunkId = locNum(frame, name);
  let chunk = world.chunk(chunkId as ChunkId);
  if (!chunk) {
    throw new Error(`${name}: ${chunkId} is not a chunk`);
  }
  return chunk;
}

function locEnt(world: World, frame: Frame, name: string): [Entity, Chunk] {
  let entId = locNum(frame, name);
  let chunkId = entChunk(entId as EntityId);
  let chunk = world.chunk(chunkId);
  if (!chunk) {
    throw new Error(`${name}: ${chunkId} is not a chunk`);
  }

  let ent = chunk.entity(entId);
  if (!ent) {
    throw new Error(`${name}: ${entId} is not an entity`);
  }

  return [ent, chunk];
}
