import { ChunkId } from "./chunk";
import { EntityId, EntityType, Var } from "./entity";
import { World } from "./world";

export function newPlayer(world: World, chunkId: ChunkId): EntityId {
  return world.eval(
    ['let', { invChunk: ['newChunk', {}] },
      ['let', {
        player: ['new', { chunk: chunkId, type: EntityType.Player }],
        cursor: ['new', { chunk: ['invChunk'], type: EntityType.Cursor }],
      },
        [['player'], 'slot', 0],
        [['player'], Var.Contents, ['invChunk']],
        [['player'], 'inv:cursor', ['cursor']],

        ['def', 'player:move', ['player', 'dx', 'dy'],
          ['move', {
            ent: ['player'],
            x: ['+', [['player'], 'x'], ['dx']],
            y: ['+', [['player'], 'y'], ['dy']],
          }]
        ],

        ['def', 'player:topWith', ['player', 'var'],
          ['topWithVar', {
            chunk: [['player'], Var.Chunk],
            x: [['player'], Var.X],
            y: [['player'], Var.Y],
            var: ['var']
          }]
        ],

        ['def', 'player:follow', ['player'],
          ['let', { portal: ['player:topWith', { player: ['player'], var: Var.Portal }] },
            ['jump', { ent: ['player'], chunk: [['portal'], Var.PortalChunk] }],
            ['move', { ent: ['player'], x: [['portal'], Var.PortalX], y: [['portal'], Var.PortalY], }]
          ]
        ],

        ['def', 'player:take', ['player'],
          ['let', { target: ['player:topWith', { player: ['player'], var: Var.Portable }] },
            ['move', {
              ent: ['jump', { ent: ['target'], chunk: [['player'], Var.Contents] }],
              x: [['player'], 'slot'], y: 0
            }]
          ],
        ],

        ['def', 'player:put', ['player'],
          ['let', {
            chunk: [['player'], Var.Chunk],
            inv: [['player'], Var.Contents],
            slot: [['player'], 'slot'],
          },
            ['let',
              { target: ['topWithVar', { chunk: ['inv'], var: Var.Portable, x: ['slot'], y: 0 }] },
              ['move', {
                'ent': ['jump', { ent: ['target'], chunk: ['chunk'] }],
                'x': [['player'], 'x'],
                'y': [['player'], 'y']
              }]
            ]
          ]
        ],

        ['def', 'player:create', ['player', 'type'],
          ['move', {
            ent: ['new', { chunk: [['player'], Var.Contents], type: ['type'] }],
            x: [['player'], 'slot'],
            y: 0
          }]
        ],

        // TODO: Validate slot range
        ['def', 'player:select', ['player', 'slot'],
          ['let', { cursor: [['player'], 'inv:cursor'] },
            [['player'], 'slot', ['slot']],
            ['move', { ent: ['cursor'], x: ['slot'], y: 0 }],
          ],
        ],

        ['player']
      ]
    ]
  );
}
