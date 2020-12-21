import { Chunk } from "./chunk";
import { Entity, EntityType, Var } from "./entity";
import { _add, _jump, _move, _new, _newChunk, _topWith } from "./script/builtins";
import { evaluate, _func, _get, Scope, _set, _, _let } from "./script/script";

export function newPlayer(scope: Scope, chunk: Chunk): Entity {
  let player = _('player');
  return evaluate(scope,
    [_let, { invChunk: [_newChunk, []] },
      [_let, {
        player: [_new, chunk, EntityType.Player],
        cursor: [_new, _('invChunk'), EntityType.Cursor],
      },
        [_set, player, 'slot', 0],
        [_set, player, Var.Contents, _('invChunk')],
        [_set, player, 'inv:cursor', _('cursor')],

        [_set, player, 'player:topWith', [_func, ['player', 'var'],
          [
            _topWith,
            [_get, player, Var.Chunk],
            [_get, player, Var.X],
            [_get, player, Var.Y],
            _('var')
          ]
        ]],

        [_set, player, 'player:move', [_func, ['args'],
          [_let, {
            player: [_get, _('args'), 'player'],
            dx: [_get, _('args'), 'dx'],
            dy: [_get, _('args'), 'dy']
          }, [
              _move, player,
              [_add, [_get, player, 'x'], _('dx')],
              [_add, [_get, player, 'y'], _('dy')]
            ]],
        ]],

        // TODO: validate that there's actually something to follow.
        [_set, player, 'player:follow', [_func, ['player'],
          [_let, {
            portal: [_('player:topWith'), player, Var.Portal],
          },
            [_let, {
              x: [_get, _('portal'), Var.PortalX],
              y: [_get, _('portal'), Var.PortalY],
            },
              [_jump, player, [_get, _('portal'), Var.PortalChunk]],
              [_move, player, _('x'), _('y')]
            ]
          ]
        ]],

        // TODO: Validate ent exists.
        [_set, player, 'player:take', [_func, ['player'],
          [_let, {
            target: [_('player:topWith'), player, Var.Portable]
          },
            [
              _move,
              [_jump, _('target'), [_get, player, Var.Contents]],
              [_get, player, 'slot'], 0
            ]
          ],
        ]],

        // TODO: Validate ent exists.
        [_set, player, 'player:put', [_func, ['player'],
          [_let, {
            chunk: [_get, player, Var.Chunk],
            inv: [_get, player, Var.Contents],
            slot: [_get, player, 'slot'],
          },
            [_let, { target: [_topWith, _('inv'), _('slot'), 0, Var.Portable] },
              [
                _move,
                [_jump, _('target'), [_get, player, 'chunk']],
                [_get, player, 'x'],
                [_get, player, 'y']
              ]
            ]
          ]
        ]],

        [_set, player, 'player:create', [_func, ['player', 'type'],
          [
            _move,
            [_new, [_get, player, Var.Contents], _('type')],
            [_get, player, 'slot'],
            0
          ]
        ]],

        // TODO: Validate slot range
        [_set, player, 'player:select', [_func, ['player', 'slot'],
          [_let, { cursor: [_get, player, 'inv:cursor'] },
            [_set, player, 'slot', _('slot')],
            [_move, _('cursor'), _('slot'), 0],
          ],
        ]],

        player
      ]
    ]
  ) as Entity;
}
