import { ChunkId } from "./chunk";
import { EntityId, EntityType, Var } from "./entity";
import { World } from "./world";

export function newPlayer(world: World, chunkId: ChunkId): EntityId {
  return world.eval(
    ['let', { invChunk: ['newChunk', []] },
      ['let', {
        player: ['new', chunkId, [EntityType.Player]],
        cursor: ['new', 'invChunk', [EntityType.Cursor]],
      },
        ['set', 'player', 'slot', 0],
        ['set', 'player', Var.Contents, 'invChunk'],
        ['set', 'player', 'inv:cursor', 'cursor'],

        ['def', 'player:topWith', ['func', ['player', 'var'],
          ['topWith',
            ['get', 'player', Var.Chunk],
            ['get', 'player', Var.X],
            ['get', 'player', Var.Y],
            'var'
          ]
        ]],

        ['def', 'player:move', ['action', ['player', 'dx', 'dy'],
          ['move',
            'player',
            ['+', ['get', 'player', 'x'], 'dx'],
            ['+', ['get', 'player', 'y'], 'dy'],
          ]
        ]],

        ['def', 'player:follow', ['action', ['player'],
          ['let', { portal: ['player:topWith', 'player', [Var.Portal]] },
            ['let', {
              x: ['get', 'portal', Var.PortalX],
              y: ['get', 'portal', Var.PortalY],
            },
              ['jump', 'player', ['get', 'portal', Var.PortalChunk]],
              ['move', 'player', 'x', 'y']
            ]
          ]
        ]],

        // TODO: Validate ent exists.
        ['def', 'player:take', ['action', ['player'],
          ['let', { target: ['player:topWith', 'player', [Var.Portable]] },
            ['move',
              ['jump', 'target', ['get', 'player', Var.Contents]],
              ['get', 'player', 'slot'], 0
            ]
          ],
        ]],

        // TODO: Validate ent exists.
        ['def', 'player:put', ['action', ['player'],
          ['let', {
            chunk: ['get', 'player', Var.Chunk],
            inv: ['get', 'player', Var.Contents],
            slot: ['get', 'player', 'slot'],
          },
            ['let',
              { target: ['topWith', 'inv', 'slot', 0, [Var.Portable]] },
              ['move',
                ['jump', 'target', ['get', 'player', 'chunk']],
                ['get', 'player', 'x'],
                ['get', 'player', 'y']
              ]
            ]
          ]
        ]],

        ['def', 'player:create', ['action', ['player', 'type'],
          ['move',
            ['new', ['get', 'player', Var.Contents], 'type'],
            ['get', 'player', 'slot'],
            0
          ]
        ]],

        // TODO: Validate slot range
        ['def', 'player:select', ['action', ['get', 'player', 'slot'],
          ['let', { cursor: ['get', 'player', 'inv:cursor'] },
            ['set', 'player', 'slot', 'slot'],
            ['move', 'cursor', 'slot', 0],
          ],
        ]],

        'player'
      ]
    ]
  );
}
