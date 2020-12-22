import { Chunk } from "./chunk";
import { Entity, EntityType, Var } from "./entity";
import { _add, _jump, _move, _new, _newChunk, _topWith } from "./script/builtins";
import { evaluate, _func, _get, Scope, _set, $ } from "./script/script";

export function newPlayer(scope: Scope, chunk: Chunk): Entity {
  let player = $('player');
  return evaluate(scope,
    [{ invChunk: [_newChunk] },
      [{
        player: [_new, chunk, EntityType.Player],
        cursor: [_new, $('invChunk'), EntityType.Cursor],
      },
        [_set, player, 'slot', 0],
        [_set, player, Var.Contents, $('invChunk')],
        [_set, player, 'inv:cursor', $('cursor')],

        [_set, player, 'player:topWith', [_func, ['player', 'var'],
          [
            _topWith,
            [_get, player, Var.Chunk],
            [_get, player, Var.X],
            [_get, player, Var.Y],
            $('var')
          ]
        ]],

        [_set, player, 'player:move', [_func, ['args'],
          [{
            player: [_get, $('args'), 'player'],
            dx: [_get, $('args'), 'dx'],
            dy: [_get, $('args'), 'dy']
          }, [
              _move, player,
              [_add, [_get, player, 'x'], $('dx')],
              [_add, [_get, player, 'y'], $('dy')]
            ]],
        ]],

        // TODO: validate that there's actually something to follow.
        [_set, player, 'player:follow', [_func, ['player'],
          [{
            portal: [$('player:topWith'), player, Var.Portal],
          },
            [{
              x: [_get, $('portal'), Var.PortalX],
              y: [_get, $('portal'), Var.PortalY],
            },
              [_jump, player, [_get, $('portal'), Var.PortalChunk]],
              [_move, player, $('x'), $('y')]
            ]
          ]
        ]],

        // TODO: Validate ent exists.
        [_set, player, 'player:take', [_func, ['player'],
          [{
            target: [$('player:topWith'), player, Var.Portable]
          },
            [
              _move,
              [_jump, $('target'), [_get, player, Var.Contents]],
              [_get, player, 'slot'], 0
            ]
          ],
        ]],

        // TODO: Validate ent exists.
        [_set, player, 'player:put', [_func, ['player'],
          [{
            chunk: [_get, player, Var.Chunk],
            inv: [_get, player, Var.Contents],
            slot: [_get, player, 'slot'],
          },
            [{ target: [_topWith, $('inv'), $('slot'), 0, Var.Portable] },
              [
                _move,
                [_jump, $('target'), [_get, player, 'chunk']],
                [_get, player, 'x'],
                [_get, player, 'y']
              ]
            ]
          ]
        ]],

        [_set, player, 'player:create', [_func, ['player', 'type'],
          [
            _move,
            [_new, [_get, player, Var.Contents], $('type')],
            [_get, player, 'slot'],
            0
          ]
        ]],

        // TODO: Validate slot range
        [_set, player, 'player:select', [_func, ['player', 'slot'],
          [{ cursor: [_get, player, 'inv:cursor'] },
            [_set, player, 'slot', $('slot')],
            [_move, $('cursor'), $('slot'), 0],
          ],
        ]],

        player
      ]
    ]
  ) as Entity;
}
