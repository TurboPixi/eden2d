import { ChunkId } from "./chunk";
import { Entity, EntityId, EntityType, Var } from "./entity";
import { World } from "./world";

export function newPlayer(world: World, chunkId: ChunkId): EntityId {
  // TODO: Builtin for chunk creation.
  let invChunk = world.newChunk();

  return world.eval([
    'let', {
      player: ['new', { chunk: chunkId, type: EntityType.Player }],
      cursor: ['new', { chunk: invChunk.id, type: EntityType.Cursor }],
    }, [
      ['set', ['player'], 'slot', 0],
      ['set', ['player'], Var.Contents, invChunk.id],
      ['set', ['player'], 'inv:cursor', ['cursor']],

      ['def', 'player:move', ['player', 'dx', 'dy'], [
        ['move', {
          ent: ['player'],
          x: ['+', ['get', ['player'], 'x'], ['dx']],
          y: ['+', ['get', ['player'], 'y'], ['dy']],
        }]
      ]],

      ['def', 'player:take', ['target'], [
        ['move', {
          ent: ['jump', { ent: ['target'], chunk: ['get', ['player'], Var.Contents] }],
          x: ['get', ['player'], 'slot'], y: 0
        }]
      ]],

      ['def', 'player:put', ['player'], [
        ['let', {
          chunk: ['get', ['player'], 'chunk'],
          slot: ['get', ['player'], 'slot'],
        }, [
            ['let', {
              target: ['topWithVar', { chunk: ['chunk'], var: Var.Portable, x: ['slot'], y: 0 }]
            }, [
                ['move', {
                  'ent': ['jump', { ent: ['target'], chunk: ['chunk'] }],
                  'x': ['get', ['player'], 'x'], 'y': ['get', ['player'], 'y']
                }]
              ]
            ]
          ]
        ]
      ]],

      // TODO: Validate slot range
      ['def', 'player:select', ['player', 'slot'], [
        ['let', {
          cursor: ['get', ['player'], 'inv:cursor'],
        }, [
          ['set', ['player'], 'slot', ['slot']],
          ['move', { ent: ['cursor'], x: ['slot'], y: 0}],
        ]],
      ]],

      ['player']
    ]]);
}
