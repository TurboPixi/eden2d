import { Frame, Def, TEnt, TChunk, TStr, TType, TAny, Native, TNum, TEntType, Definition, Type, Let, Get, TBool } from "./script";
import { Chunk, ChunkId } from "../chunk";
import { entChunk, Entity, EntityId, EntityType, Var } from "../entity";
import { World } from "../world";

export const Portal = "portal";
export const SetVar = "setvar";
export const GetVar = "getvar";
export const New = "new";
export const Move = "move";
export const Jump = "jump";

export const builtins: Definition[] = [
  [Def, Portal, { type: TEntType, from: TChunk, fx: TNum, fy: TNum, to: TChunk, tx: TNum, ty: TNum }, [
    [Let, { ent: [New, { chunk: [Get, 'from'], type: [Get, 'type'], x: [Get, 'fx'], y: [Get, 'fy'] }] }, [
      [SetVar, { ent: [Get, 'ent'], name: Var.PortalChunk, type: TChunk, value: [Get, 'to'] }],
      [SetVar, { ent: [Get, 'ent'], name: Var.PortalX, type: TNum, value: [Get, 'tx'] }],
      [SetVar, { ent: [Get, 'ent'], name: Var.PortalY, type: TNum, value: [Get, 'ty'] }],
    ]]]],

  [Def, SetVar, { ent: TEnt, name: TStr, type: TType, value: TAny }, [Native, function (world: World, frame: Frame): void {
    let entId = frame['ent'] as EntityId;
    let name = frame['name'] as string;
    let type = frame['type'] as Type;
    let value = frame['value'] as any;

    let chunkId = entChunk(entId);
    let chunk = world.chunk(chunkId);
    let ent = chunk.entity(entId);
    ent.setVar(name as Var, type, value);
  }]],

  [Def, GetVar, { ent: TEnt, name: TStr, type: TType }, [Native, function (world: World, frame: Frame): any {
    let entId = frame['ent'] as EntityId;
    let name = frame['name'] as string;
    let type = frame['type'] as Type;

    let chunkId = entChunk(entId);
    let chunk = world.chunk(chunkId);
    let ent = chunk.entity(entId);
    return ent.getVar(name as Var, type);
  }]],

  [Def, New, { chunk: TChunk, type: TEntType, x: TNum, y: TNum }, [Native, function (world: World, frame: Frame): EntityId {
    let chunkId = frame['chunk'] as number;
    let type = frame['type'] as EntityType;
    let x = frame['x'] as number;
    let y = frame['y'] as number;

    let chunk = world.chunk(chunkId);
    let ent = new Entity(type);
    return chunk.addEntity(ent, x, y);
  }]],

  [Def, Move, { ent: TEnt, dx: TNum, dy: TNum }, [Native, function (world: World, frame: Frame): void {
    let entId = frame['ent'] as EntityId;
    let dx = frame['dx'] as number;
    let dy = frame['dy'] as number;

    let chunkId = entChunk(entId);
    let chunk = world.chunk(chunkId);
    let ent = chunk.entity(entId);
    ent.move(ent.x + dx, ent.y + dy);
  }]],

  [Def, Jump, { ent: TEnt, chunk: TChunk, x: TNum, y: TNum }, [Native, function (world: World, frame: Frame): EntityId {
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
    if (ent.getVar(boolVar, TBool)) {
      return ent;
    }
  }
  return null;
}
