import { ChunkId } from "./chunk";
import { EntityId, EntityType, Var } from "./entity";
import { World } from "./world";

export function newPlayer(world: World, chunkId: ChunkId): EntityId {
  return world.eval([
    'let', { invChunk: ['newChunk', {}] }, [
      ['let', {
        player: ['new', { chunk: chunkId, type: EntityType.Player }],
        cursor: ['new', { chunk: ['invChunk'], type: EntityType.Cursor }],
      }, [
          ['set', ['player'], 'slot', 0],
          ['set', ['player'], Var.Contents, ['invChunk']],
          ['set', ['player'], 'inv:cursor', ['cursor']],

          ['def', 'player:move', ['player', 'dx', 'dy'], [
            ['move', {
              ent: ['player'],
              x: ['+', ['get', ['player'], 'x'], ['dx']],
              y: ['+', ['get', ['player'], 'y'], ['dy']],
            }]
          ]],

          ['def', 'player:topWith', ['player', 'var'], [
            ['topWithVar', {
              chunk: ['get', ['player'], Var.Chunk],
              x: ['get', ['player'], Var.X],
              y: ['get', ['player'], Var.Y],
              var: ['var']
            }]
          ]],

          ['def', 'player:follow', ['player'], [
            ['let', { portal: ['player:topWith', { player: ['player'], var: Var.Portal }] }, [
              ['jump', { ent: ['player'], chunk: ['get', ['portal'], Var.PortalChunk] }],
              ['move', { ent: ['player'], x: ['get', ['portal'], Var.PortalX], y: ['get', ['portal'], Var.PortalY], }]
            ]]
          ]],

          ['def', 'player:take', ['player'], [
            ['let', { target: ['player:topWith', { player: ['player'], var: Var.Portable }] }, [
              ['move', {
                ent: ['jump', { ent: ['target'], chunk: ['get', ['player'], Var.Contents] }],
                x: ['get', ['player'], 'slot'], y: 0
              }]
            ]],
          ]],

          ['def', 'player:put', ['player'], [
            ['let', {
              chunk: ['get', ['player'], Var.Chunk],
              inv: ['get', ['player'], Var.Contents],
              slot: ['get', ['player'], 'slot'],
            }, [
                ['let', {
                  target: ['topWithVar', { chunk: ['inv'], var: Var.Portable, x: ['slot'], y: 0 }]
                }, [
                    [
                      'move', {
                        'ent': ['jump', { ent: ['target'], chunk: ['chunk'] }],
                        'x': ['get', ['player'], 'x'],
                        'y': ['get', ['player'], 'y']
                      }
                    ]
                  ]
                ]
              ]
            ]
          ]],

          ['def', 'player:create', ['player', 'type'], [
            ['move', {
              ent: ['new', {
                chunk: ['get', ['player'], Var.Contents],
                type: ['type']
              }],
              x: ['get', ['player'], 'slot'],
              y: 0
            }]
          ]],

          // TODO: Validate slot range
          ['def', 'player:select', ['player', 'slot'], [
            ['let', {
              cursor: ['get', ['player'], 'inv:cursor'],
            }, [
                ['set', ['player'], 'slot', ['slot']],
                ['move', { ent: ['cursor'], x: ['slot'], y: 0 }],
              ]],
          ]],

          ['player']
        ]
      ]
    ]
  ]);
}
