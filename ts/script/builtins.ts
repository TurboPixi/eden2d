import { chuck, EExpr, EVal, Scope } from "./script";
import { Chunk, isChunk } from "../chunk";
import { Entity, EntityType, isEntity } from "../entity";

export const builtins: EExpr[] = [
  ['set', ['self'], '+', ['native', ['x', 'y'],
    function (scope: Scope): EVal {
      return locNum(scope, 'x') + locNum(scope, 'y');
    }
  ]],

  ['set', ['self'], 'newChunk', ['native', [],
    function (scope: Scope): EVal {
      return scope.world.newChunk();
    }
  ]],

  ['set', ['self'], 'new', ['native', ['chunk', 'type'],
    function (scope: Scope): EVal {
      let chunk = locChunk(scope, 'chunk');
      let ent = new Entity(scope.world, locStr(scope, 'type') as EntityType);
      chunk.addEntity(ent);
      return ent;
    }
  ]],

  ['set', ['self'], 'move', ['native', ['ent', 'x', 'y'],
    function (scope: Scope): EVal {
      let x = locNum(scope, 'x');
      let y = locNum(scope, 'y');
      let ent = locEnt(scope, 'ent');
      ent.move(x, y);
      return undefined;
    }
  ]],

  ['set', ['self'], 'jump', ['native', ['ent', 'chunk'],
    function (scope: Scope): EVal {
      let ent = locEnt(scope, 'ent');
      let to = locChunk(scope, 'chunk');
      to.addEntity(ent);
      return ent;
    }
  ]],

  ['set', ['self'], 'topWith', ['native', ['chunk', 'x', 'y', 'var'],
    function (scope: Scope): EVal {
      let chunk = locChunk(scope, 'chunk');
      let x = locNum(scope, 'x');
      let y = locNum(scope, 'y');
      let v = locStr(scope, 'var');
      let ents = chunk.entitiesAt(x, y);
      for (var ent of ents) {
        if (ent.ref(v) !== undefined) {
          return ent;
        }
      }
      return undefined;
    }
  ]],
];

function locNum(scope: Scope, name: string): number {
  let value = scope.ref(name) as number;
  if (typeof value != "number") {
    chuck(scope, `${name}: ${value} is not a number`);
  }
  return value;
}

function locStr(scope: Scope, name: string): string {
  let value = scope.ref(name) as string;
  if (typeof value != "string") {
    chuck(scope, `${name}: ${value} is not a string`);
  }
  return value;
}

function locChunk(scope: Scope, name: string): Chunk {
  let chunk = isChunk(scope.ref(name));
  if (chunk === undefined) {
    chuck(scope, `${name} is not a chunk`);
  }
  return chunk as Chunk;
}

function locEnt(scope: Scope, name: string): Entity {
  let ent = isEntity(scope.ref(name));
  if (ent === undefined) {
    chuck(scope, `${name} is not an entity`);
  }
  return ent as Entity;
}
