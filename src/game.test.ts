import { describe, expect, it } from 'vitest';
import { createGame, movePlayer, type Direction } from './game';
import { getTile, isWalkable } from './map';

describe('createGame', () => {
  it('ставит героя на пол', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { map, player } = createGame(seed);
      expect(getTile(map, player.x, player.y)).toBe('floor');
    }
  });
});

describe('movePlayer', () => {
  it('сдвигает героя на свободную клетку', () => {
    const state = createGame(42);
    const start = { ...state.player };
    // Герой стоит в центре комнаты (минимум 4×4), так что слева от него пол.
    expect(movePlayer(state, 'left')).toBe(true);
    expect(state.player).toEqual({ x: start.x - 1, y: start.y });
  });

  it('не пускает героя в стену', () => {
    const state = createGame(42);
    state.monsters = []; // чтобы монстр не подошёл и не загородил путь
    // Идём влево, пока не упрёмся в стену.
    while (movePlayer(state, 'left')) {
      // шагаем
    }
    const before = { ...state.player };
    expect(movePlayer(state, 'left')).toBe(false);
    expect(state.player).toEqual(before);
    expect(isWalkable(state.map, state.player.x - 1, state.player.y)).toBe(false);
  });

  it('пишет сообщение, когда герой встаёт на лестницу', () => {
    const state = createGame(42);
    state.monsters = [];
    const stairsIndex = state.map.tiles.indexOf('stairs');
    const stairs = { x: stairsIndex % state.map.width, y: Math.floor(stairsIndex / state.map.width) };
    // Ставим героя рядом с лестницей и делаем шаг на неё.
    const directions: Array<[Direction, number, number]> = [
      ['right', -1, 0],
      ['left', 1, 0],
      ['down', 0, -1],
      ['up', 0, 1],
    ];
    const [direction, dx, dy] = directions.find(([, dx, dy]) => isWalkable(state.map, stairs.x + dx, stairs.y + dy))!;
    state.player = { x: stairs.x + dx, y: stairs.y + dy };

    expect(movePlayer(state, direction)).toBe(true);
    expect(state.log[0]).toContain('лестницу');
  });
});
