import { describe, expect, it } from 'vitest';
import { createGame, monstersAct, movePlayer } from './game';
import { generateDungeon, getTile, type DungeonMap, type Tile } from './map';
import { canSee, nextStepToward, spawnMonsters, type Monster } from './monsters';
import { createRng } from './rng';

/** Карта из строк: '#' — стена, '.' — пол. Удобно для точечных тестов. */
function mapFromStrings(rows: string[]): DungeonMap {
  const tiles: Tile[] = rows.join('').split('').map((char) => (char === '#' ? 'wall' : 'floor'));
  return { width: rows[0].length, height: rows.length, tiles, rooms: [] };
}

const noBlocks = () => false;

describe('spawnMonsters', () => {
  it('ставит монстров только на пол, по одному на клетку и не в стартовую комнату', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRng(seed);
      const map = generateDungeon(60, 36, rng);
      const monsters = spawnMonsters(map, rng);
      const start = map.rooms[0];
      const positions = new Set(monsters.map((m) => `${m.x},${m.y}`));

      expect(positions.size).toBe(monsters.length);
      for (const monster of monsters) {
        expect(getTile(map, monster.x, monster.y)).toBe('floor');
        const inStartRoom =
          monster.x >= start.x && monster.x < start.x + start.width && monster.y >= start.y && monster.y < start.y + start.height;
        expect(inStartRoom).toBe(false);
      }
    }
  });

  it('в подземелье обычно есть монстры', () => {
    const total = [1, 2, 3, 4, 5].reduce((sum, seed) => sum + createGame(seed).monsters.length, 0);
    expect(total).toBeGreaterThan(10);
  });
});

describe('canSee', () => {
  const map = mapFromStrings([
    '#########',
    '#.......#',
    '#...#...#',
    '#.......#',
    '#########',
  ]);

  it('видит по прямой в открытой комнате', () => {
    expect(canSee(map, { x: 1, y: 1 }, { x: 7, y: 1 }, 10)).toBe(true);
  });

  it('не видит сквозь стену', () => {
    expect(canSee(map, { x: 2, y: 2 }, { x: 6, y: 2 }, 10)).toBe(false);
  });

  it('не видит дальше дальности обзора', () => {
    expect(canSee(map, { x: 1, y: 1 }, { x: 7, y: 1 }, 3)).toBe(false);
  });
});

describe('nextStepToward', () => {
  it('обходит стену по кратчайшему пути', () => {
    const map = mapFromStrings([
      '#######',
      '#.....#',
      '#.###.#',
      '#.....#',
      '#######',
    ]);
    // Из левого нижнего угла в правый верхний: любой первый шаг приближает к цели.
    const step = nextStepToward(map, { x: 1, y: 3 }, { x: 5, y: 1 }, noBlocks);
    expect([{ x: 1, y: 2 }, { x: 2, y: 3 }]).toContainEqual(step);
  });

  it('возвращает null, если пути нет', () => {
    const map = mapFromStrings([
      '#######',
      '#..#..#',
      '#######',
    ]);
    expect(nextStepToward(map, { x: 1, y: 1 }, { x: 5, y: 1 }, noBlocks)).toBeNull();
  });
});

describe('поведение монстров', () => {
  function gameWithOneMonster(monster: Partial<Monster>) {
    const state = createGame(1);
    state.map = mapFromStrings([
      '############',
      '#..........#',
      '#..........#',
      '############',
    ]);
    Object.assign(state.player, { x: 1, y: 1 });
    state.monsters = [{ id: 1, kind: 'goblin', x: 8, y: 1, hp: 8, target: null, ...monster }];
    state.log = [];
    return state;
  }

  it('замечает героя и идёт к нему', () => {
    const state = gameWithOneMonster({});
    monstersAct(state);
    expect(state.monsters[0].x).toBe(7);
    expect(state.log[0]).toBe('Гоблин замечает тебя!');
  });

  it('останавливается рядом с героем и не залезает на его клетку', () => {
    const state = gameWithOneMonster({ x: 3 });
    for (let turn = 0; turn < 5; turn++) {
      monstersAct(state);
    }
    expect(state.monsters[0]).toMatchObject({ x: 2, y: 1 });
  });

  it('не замечает героя за пределами обзора', () => {
    const state = gameWithOneMonster({ kind: 'rat', x: 10 }); // у крысы обзор 5
    monstersAct(state);
    expect(state.monsters[0].x).toBe(10);
    expect(state.monsters[0].target).toBeNull();
  });

  it('герой не проходит сквозь монстра, а атакует его', () => {
    const state = gameWithOneMonster({ x: 2 });
    expect(movePlayer(state, 'right')).toBe(true);
    expect(state.player).toMatchObject({ x: 1, y: 1 });
    expect(state.monsters[0].hp).toBeLessThan(8);
  });
});
