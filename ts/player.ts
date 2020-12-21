import { Chunk } from "./chunk";
import { Entity, EntityType, Var } from "./entity";
import { evaluate, Scope } from "./script/script";

export function newPlayer(scope: Scope, chunk: Chunk): Entity {
  return evaluate(scope,
    ['let', { 'invChunk': [['newChunk'], []] },
      ['let', {
        player: [['new'], chunk, EntityType.Player],
        cursor: [['new'], ['invChunk'], EntityType.Cursor],
      },
        ['set', ['player'], 'slot', 0],
        ['set', ['player'], Var.Contents, ['invChunk']],
        ['set', ['player'], 'inv:cursor', ['cursor']],

        ['set', ['player'], 'player:topWith', ['func', ['player', 'var'],
          [
            ['topWith'],
            ['get', ['player'], Var.Chunk],
            ['get', ['player'], Var.X],
            ['get', ['player'], Var.Y],
            ['var']
          ]
        ]],

        ['set', ['player'], 'player:move', ['func', ['args'],
          ['let', {
            player: ['get', ['args'], 'player'],
            dx: ['get', ['args'], 'dx'],
            dy: ['get', ['args'], 'dy']
          }, [
            ['move'], ['player'],
            [['+'], ['get', ['player'], 'x'], ['dx']],
            [['+'], ['get', ['player'], 'y'], ['dy']]
          ]],
        ]],

        // TODO: validate that there's actually something to follow.
        ['set', ['player'], 'player:follow', ['func', ['player'],
          ['let', {
            portal: [['player:topWith'], ['player'], Var.Portal],
          },
            ['let', {
              x: ['get', ['portal'], Var.PortalX],
              y: ['get', ['portal'], Var.PortalY],
            },
              [['jump'], ['player'], ['get', ['portal'], Var.PortalChunk]],
              [['move'], ['player'], ['x'], ['y']]
            ]
          ]
        ]],

        // TODO: Validate ent exists.
        ['set', ['player'], 'player:take', ['func', ['player'],
          ['let', {
            target: [['player:topWith'], ['player'], Var.Portable]
          },
            [
              ['move'],
              [['jump'], ['target'], ['get', ['player'], Var.Contents]],
              ['get', ['player'], 'slot'], 0
            ]
          ],
        ]],

        // TODO: Validate ent exists.
        ['set', ['player'], 'player:put', ['func', ['player'],
          ['let', {
            chunk: ['get', ['player'], Var.Chunk],
            inv: ['get', ['player'], Var.Contents],
            slot: ['get', ['player'], 'slot'],
          },
            ['let', { target: [['topWith'], ['inv'], ['slot'], 0, Var.Portable] },
              [
                ['move'],
                [['jump'], ['target'], ['get', ['player'], 'chunk']],
                ['get', ['player'], 'x'],
                ['get', ['player'], 'y']
              ]
            ]
          ]
        ]],

        ['set', ['player'], 'player:create', ['func', ['player', 'type'],
          [
            ['move'],
            [['new'], ['get', ['player'], Var.Contents], ['type']],
            ['get', ['player'], 'slot'],
            0
          ]
        ]],

        // TODO: Validate slot range
        ['set', ['player'], 'player:select', ['func', ['player', 'slot'],
          ['let', { cursor: ['get', ['player'], 'inv:cursor'] },
            ['set', ['player'], 'slot', ['slot']],
            [['move'], ['cursor'], ['slot'], 0],
          ],
        ]],

        ['player']
      ]
    ]
  ) as Entity;
}
