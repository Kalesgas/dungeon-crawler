import { describe, expect, it } from 'vitest';
import { rollDamage } from './combat';
import { createGame, movePlayer, REGEN_INTERVAL, waitTurn, type GameState } from './game';
import type { Tile } from './map';
import type { Monster } from './monsters';
import { createRng } from './rng';

/** Маленькая открытая комната 10×1, герой слева, монстры — какие передали. */
function arena(monsters: Array<Partial<Monster>>): GameState {
  const state = createGame(1);
  state.map = {
    width: 12,
    height: 3,
    tiles: ('############' + '#..........#' + '############').split('').map((c): Tile => (c === '#' ? 'wall' : 'floor')),
    rooms: [],
  };
  Object.assign(state.player, { x: 1, y: 1 });
  state.monsters = monsters.map((monster, index) => ({
    id: index + 1,
    kind: 'goblin',
    x: 2,
    y: 1,
    hp: 8,
    target: null,
    ...monster,
  }));
  state.log = [];
  return state;
}

describe('rollDamage', () => {
  it('урон — это атака минус защита с разбросом ±1', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const damage = rollDamage(6, 2, rng);
      expect(damage).toBeGreaterThanOrEqual(3);
      expect(damage).toBeLessThanOrEqual(5);
    }
  });

  it('даже против толстой брони урон не меньше 1', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      expect(rollDamage(1, 10, rng)).toBe(1);
    }
  });
});

describe('бой', () => {
  it('шаг на монстра — это удар', () => {
    const state = arena([{ hp: 100 }]);
    movePlayer(state, 'right');
    expect(state.monsters[0].hp).toBeLessThan(100);
    expect(state.log).toContainEqual(expect.stringMatching(/^Ты бьёшь гоблина на \d+\.$/));
  });

  it('монстр с нулём здоровья погибает и засчитывается', () => {
    const state = arena([{ kind: 'rat', hp: 1 }]);
    movePlayer(state, 'right');
    expect(state.monsters).toHaveLength(0);
    expect(state.kills).toBe(1);
    expect(state.log[0]).toMatch(/Крыса погибает!$/);
  });

  it('монстр рядом с героем бьёт в ответ', () => {
    const state = arena([{ hp: 100 }]);
    movePlayer(state, 'right');
    expect(state.player.hp).toBeLessThan(state.player.maxHp);
    expect(state.log[0]).toMatch(/^Гоблин бьёт тебя на \d+\.$/);
  });

  it('когда здоровье кончается — Game Over, ходить больше нельзя', () => {
    const state = arena([{ kind: 'orc', hp: 100 }]);
    state.player.hp = 1;
    waitTurn(state);
    expect(state.player.hp).toBe(0);
    expect(state.gameOver).toBe(true);
    expect(state.log[0]).toBe('Ты погиб. Тебя убил орк.');
    expect(movePlayer(state, 'up')).toBe(false);
    expect(waitTurn(state)).toBe(false);
  });

  it('герой понемногу восстанавливает здоровье', () => {
    const state = arena([]);
    state.player.hp = 10;
    for (let turn = 0; turn < REGEN_INTERVAL * 3; turn++) {
      waitTurn(state);
    }
    expect(state.player.hp).toBe(13);
  });

  it('здоровье не растёт выше максимума', () => {
    const state = arena([]);
    for (let turn = 0; turn < REGEN_INTERVAL * 3; turn++) {
      waitTurn(state);
    }
    expect(state.player.hp).toBe(state.player.maxHp);
  });
});
