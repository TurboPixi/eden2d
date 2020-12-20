import { chuck, EDef, EVal, Scope } from "./script";
import { Chunk } from "../chunk";
import { Entity, EntityType, Var } from "../entity";

export const builtins: EDef[] = [
  ['def', '+', ['native', 'func', ['x', 'y'],
    function (scope: Scope): EVal {
      return locNum(scope, 'x') + locNum(scope, 'y');
    }
  ]],

  ['def', 'newChunk', ['native', 'func', [],
    function (scope: Scope): EVal {
      return scope.world.newChunk();
    }
  ]],

  ['def', 'new', ['native', 'func', ['chunk', 'type'],
    function (scope: Scope): EVal {
      let chunk = locChunk(scope, 'chunk');
      let ent = new Entity(scope.world, locStr(scope, 'type') as EntityType);
      chunk.addEntity(ent);
      return ent;
    }
  ]],

  ['def', 'move', ['native', 'func', ['ent', 'x', 'y'],
    function (scope: Scope): EVal {
      let x = locNum(scope, 'x');
      let y = locNum(scope, 'y');
      let ent = locEnt(scope, 'ent');
      ent.move(x, y);
      return undefined;
    }
  ]],

  ['def', 'jump', ['native', 'func', ['ent', 'chunk'],
    function (scope: Scope): EVal {
      let ent = locEnt(scope, 'ent');
      let to = locChunk(scope, 'chunk');
      to.addEntity(ent);
      return ent;
    }
  ]],

  ['def', 'topWith', ['native', 'func', ['chunk', 'x', 'y', 'var'],
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

  ['def', 'portal', ['action', ['type', 'from', 'fx', 'fy', 'to', 'tx', 'ty'],
    ['let', { ent: [['new'], ['from'], ['type']] },
      [['move'], ['ent'], ['fx'], ['fy']],
      ['set', ['ent'], Var.PortalChunk, ['to']],
      ['set', ['ent'], Var.PortalX, ['tx']],
      ['set', ['ent'], Var.PortalY, ['ty']],
      ['ent']
    ]
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
  let chunk = scope.ref(name);
  if (!(chunk instanceof Chunk)) {
    chuck(scope, `${name} is not a chunk`);
  }
  return chunk as Chunk;
}

function locEnt(scope: Scope, name: string): Entity {
  let ent = scope.ref(name);
  if (!(ent instanceof Entity)) {
    chuck(scope, `${name} is not an entity`);
  }
  return ent as Entity;
}
