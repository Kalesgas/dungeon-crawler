import { describe, expect, it } from 'vitest';
import { generateDungeon, getTile, isWalkable, roomCenter, type DungeonMap } from './map';
import { createRng } from './rng';

function makeMap(seed: number): DungeonMap {
  return generateDungeon(60, 36, createRng(seed));
}

/** Сколько проходимых клеток достижимо из точки (поиск в ширину). */
function countReachable(map: DungeonMap, startX: number, startY: number): number {
  const visited = new Set<number>([startY * map.width + startX]);
  const queue: Array<[number, number]> = [[startX, startY]];
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = ny * map.width + nx;
      if (!visited.has(key) && isWalkable(map, nx, ny)) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return visited.size;
}

describe('generateDungeon', () => {
  it('с одним и тем же сидом строит одинаковые карты', () => {
    expect(makeMap(42)).toEqual(makeMap(42));
  });

  it('с разными сидами строит разные карты', () => {
    expect(makeMap(1).tiles).not.toEqual(makeMap(2).tiles);
  });

  it('создаёт несколько комнат', () => {
    expect(makeMap(7).rooms.length).toBeGreaterThanOrEqual(5);
  });

  it('по краю карты всегда стена', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const map = makeMap(seed);
      for (let x = 0; x < map.width; x++) {
        expect(getTile(map, x, 0)).toBe('wall');
        expect(getTile(map, x, map.height - 1)).toBe('wall');
      }
      for (let y = 0; y < map.height; y++) {
        expect(getTile(map, 0, y)).toBe('wall');
        expect(getTile(map, map.width - 1, y)).toBe('wall');
      }
    }
  });

  it('все проходимые клетки связаны — до лестницы всегда можно дойти', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const map = makeMap(seed);
      const start = roomCenter(map.rooms[0]);
      const walkable = map.tiles.filter((tile) => tile !== 'wall').length;
      expect(countReachable(map, start.x, start.y)).toBe(walkable);
    }
  });

  it('ровно одна лестница вниз', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(makeMap(seed).tiles.filter((tile) => tile === 'stairs')).toHaveLength(1);
    }
  });
});
