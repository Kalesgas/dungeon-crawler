import { getTile, isWalkable, type DungeonMap, type Position } from './map';
import { randInt, type Rng } from './rng';

export type MonsterKind = 'rat' | 'goblin' | 'orc';

export interface MonsterTemplate {
  name: string;
  glyph: string;
  color: string;
  maxHp: number;
  attack: number;
  defense: number;
  /** На сколько клеток монстр видит героя. */
  sightRange: number;
  /** Насколько часто встречается: чем больше, тем чаще. */
  spawnWeight: number;
}

export const MONSTER_TEMPLATES: Record<MonsterKind, MonsterTemplate> = {
  rat: { name: 'Крыса', glyph: 'r', color: '#a89f91', maxHp: 4, attack: 2, defense: 0, sightRange: 5, spawnWeight: 50 },
  goblin: { name: 'Гоблин', glyph: 'g', color: '#7fbf5f', maxHp: 8, attack: 3, defense: 1, sightRange: 7, spawnWeight: 35 },
  orc: { name: 'Орк', glyph: 'o', color: '#d9603b', maxHp: 14, attack: 5, defense: 2, sightRange: 6, spawnWeight: 15 },
};

export interface Monster {
  id: number;
  kind: MonsterKind;
  x: number;
  y: number;
  hp: number;
  /** Где монстр последний раз видел героя. null — героя ещё не замечал. */
  target: Position | null;
}

function pickKind(rng: Rng): MonsterKind {
  const kinds = Object.keys(MONSTER_TEMPLATES) as MonsterKind[];
  const total = kinds.reduce((sum, kind) => sum + MONSTER_TEMPLATES[kind].spawnWeight, 0);
  let roll = rng() * total;
  for (const kind of kinds) {
    roll -= MONSTER_TEMPLATES[kind].spawnWeight;
    if (roll < 0) {
      return kind;
    }
  }
  return kinds[kinds.length - 1];
}

/**
 * Расселяет монстров по комнатам: от 0 до maxPerRoom в каждой,
 * кроме первой — там стартует герой, пусть у него будет передышка.
 */
export function spawnMonsters(map: DungeonMap, rng: Rng, maxPerRoom = 2): Monster[] {
  const monsters: Monster[] = [];
  for (const room of map.rooms.slice(1)) {
    const count = randInt(rng, 0, maxPerRoom);
    for (let i = 0; i < count; i++) {
      const x = randInt(rng, room.x, room.x + room.width - 1);
      const y = randInt(rng, room.y, room.y + room.height - 1);
      const occupied = monsters.some((monster) => monster.x === x && monster.y === y);
      if (occupied || getTile(map, x, y) !== 'floor') {
        continue;
      }
      const kind = pickKind(rng);
      monsters.push({ id: monsters.length + 1, kind, x, y, hp: MONSTER_TEMPLATES[kind].maxHp, target: null });
    }
  }
  return monsters;
}

/**
 * Видно ли клетку `to` из клетки `from`: она в пределах дальности
 * и на прямой линии между ними нет стен (алгоритм Брезенхэма).
 */
export function canSee(map: DungeonMap, from: Position, to: Position, range: number): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx * dx + dy * dy > range * range) {
    return false;
  }

  let x = from.x;
  let y = from.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let error = absDx - absDy;

  while (x !== to.x || y !== to.y) {
    const doubled = error * 2;
    if (doubled > -absDy) {
      error -= absDy;
      x += stepX;
    }
    if (doubled < absDx) {
      error += absDx;
      y += stepY;
    }
    if ((x !== to.x || y !== to.y) && !isWalkable(map, x, y)) {
      return false;
    }
  }
  return true;
}

const NEIGHBORS: Position[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/**
 * Первый шаг кратчайшего пути от `from` к `to` (поиск в ширину).
 * `isBlocked` — занятые клетки (другие монстры), через них путь не строится.
 * Возвращает null, если пути нет или он длиннее maxDistance.
 */
export function nextStepToward(
  map: DungeonMap,
  from: Position,
  to: Position,
  isBlocked: (x: number, y: number) => boolean,
  maxDistance = 20,
): Position | null {
  const key = (p: Position) => p.y * map.width + p.x;
  const cameFrom = new Map<number, Position>();
  const distance = new Map<number, number>([[key(from), 0]]);
  const queue: Position[] = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === to.x && current.y === to.y) {
      // Разматываем путь назад до клетки, соседней с from.
      let step = current;
      while (cameFrom.get(key(step)) && key(cameFrom.get(key(step))!) !== key(from)) {
        step = cameFrom.get(key(step))!;
      }
      return step;
    }
    const currentDistance = distance.get(key(current))!;
    if (currentDistance >= maxDistance) {
      continue;
    }
    for (const delta of NEIGHBORS) {
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      const isGoal = next.x === to.x && next.y === to.y;
      if (distance.has(key(next)) || !isWalkable(map, next.x, next.y) || (!isGoal && isBlocked(next.x, next.y))) {
        continue;
      }
      distance.set(key(next), currentDistance + 1);
      cameFrom.set(key(next), current);
      queue.push(next);
    }
  }
  return null;
}
