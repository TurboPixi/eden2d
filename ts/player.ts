import { Chunk } from "./chunk";
import { Entity, EntityType, Var } from "./entity";
import { _add, _get, _set, } from "./script/builtins";
import { Scope, $, nil, _, invoke } from "./script/script";
import { _jump, _move, _new, _newChunk, _topWith } from "./world";

export function newPlayer(scope: Scope, chunk: Chunk): Entity {
  let player = $('player');

  return invoke(scope, _(
    { invChunk: [_newChunk] },
    {
      player: [_new, chunk, EntityType.Player],
      cursor: [_new, $('invChunk'), EntityType.Cursor]
    },

    [_set, player, 'slot', 0],
    [_set, player, Var.Contents, $('invChunk')],
    [_set, player, 'inv:cursor', $('cursor')],

    [_set, player, 'player:topWith', _({ player: nil, var: nil },
      [_topWith,
        [_get, player, Var.Chunk],
        [_get, player, Var.X],
        [_get, player, Var.Y],
        $('var')]
    )],

    [_set, player, 'player:move', _({ player: nil, dx: 0, dy: 0 },
      [_move, player,
        [_add, [_get, player, 'x'], $('dx')],
        [_add, [_get, player, 'y'], $('dy')]],
    )],

    // TODO: validate that there's actually something to follow.
    [_set, player, 'player:follow', _({ player: nil },
      { portal: [$('player:topWith'), player, Var.Portal] },
      {
        x: [_get, $('portal'), Var.PortalX],
        y: [_get, $('portal'), Var.PortalY],
      },
      [_jump, player, [_get, $('portal'), Var.PortalChunk]],
      [_move, player, $('x'), $('y')]
    )],

    // TODO: Validate ent exists.
    [_set, player, 'player:take', _({ player: nil },
      { target: [$('player:topWith'), player, Var.Portable] },
      [_move,
        [_jump, $('target'), [_get, player, Var.Contents]],
        [_get, player, 'slot'], 0]
    )],

    // TODO: Validate ent exists.
    [_set, player, 'player:put', _({ player: nil },
      {
        chunk: [_get, player, Var.Chunk],
        inv: [_get, player, Var.Contents],
        slot: [_get, player, 'slot']
      },
      { target: [_topWith, $('inv'), $('slot'), 0, Var.Portable] },
      [_move,
        [_jump, $('target'), [_get, player, 'chunk']],
        [_get, player, 'x'],
        [_get, player, 'y']]
    )],

    [_set, player, 'player:create', _({ player: nil, type: nil },
      [_move,
        [_new, [_get, player, Var.Contents], $('type')],
        [_get, player, 'slot'], 0]
    )],

    // TODO: Validate slot range
    [_set, player, 'player:select', _({ player: nil, slot: 0 },
      { cursor: [_get, player, 'inv:cursor'] },
      [_set, player, 'slot', $('slot')],
      [_move, $('cursor'), $('slot'), 0],
    )],

    player
  )
  ) as Entity;
}
