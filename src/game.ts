import { generateDungeon, getTile, isWalkable, roomCenter, type DungeonMap, type Position } from './map';
import { canSee, MONSTER_TEMPLATES, nextStepToward, spawnMonsters, type Monster } from './monsters';
import { createRng, type Rng } from './rng';

export const MAP_WIDTH = 60;
export const MAP_HEIGHT = 36;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  seed: number;
  rng: Rng;
  map: DungeonMap;
  player: Position;
  monsters: Monster[];
  /** Сообщения для игрока, самое новое — первое. */
  log: string[];
}

const DIRECTION_DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createGame(seed: number): GameState {
  const rng = createRng(seed);
  const map = generateDungeon(MAP_WIDTH, MAP_HEIGHT, rng);
  return {
    seed,
    rng,
    map,
    player: roomCenter(map.rooms[0]),
    monsters: spawnMonsters(map, rng),
    log: ['Ты спускаешься в подземелье. Найди лестницу вниз.'],
  };
}

export function addMessage(state: GameState, message: string): void {
  state.log.unshift(message);
  state.log.length = Math.min(state.log.length, 5);
}

export function monsterAt(state: GameState, x: number, y: number): Monster | undefined {
  return state.monsters.find((monster) => monster.x === x && monster.y === y);
}

function isAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/** Ход монстров: замечают героя, идут к нему или к месту, где видели его последний раз. */
export function monstersAct(state: GameState): void {
  for (const monster of state.monsters) {
    const template = MONSTER_TEMPLATES[monster.kind];

    if (canSee(state.map, monster, state.player, template.sightRange)) {
      if (!monster.target) {
        addMessage(state, `${template.name} замечает тебя!`);
      }
      monster.target = { ...state.player };
    }

    if (!monster.target || isAdjacent(monster, state.player)) {
      continue; // героя не видел — стоит; уже рядом — драться научится в задаче «Бои»
    }

    const occupied = (x: number, y: number) =>
      (x === state.player.x && y === state.player.y) || monsterAt(state, x, y) !== undefined;
    const step = nextStepToward(state.map, monster, monster.target, occupied);
    if (step && !occupied(step.x, step.y)) {
      monster.x = step.x;
      monster.y = step.y;
    }
    if (monster.x === monster.target.x && monster.y === monster.target.y) {
      monster.target = null; // дошёл до места, героя там нет — успокаивается
    }
  }
}

/** Пытается сдвинуть героя. Возвращает true, если шаг получился (и ход перешёл монстрам). */
export function movePlayer(state: GameState, direction: Direction): boolean {
  const delta = DIRECTION_DELTAS[direction];
  const target = { x: state.player.x + delta.x, y: state.player.y + delta.y };

  const blocker = monsterAt(state, target.x, target.y);
  if (blocker) {
    addMessage(state, `${MONSTER_TEMPLATES[blocker.kind].name} преграждает путь.`);
    return false;
  }
  if (!isWalkable(state.map, target.x, target.y)) {
    return false;
  }

  state.player = target;
  if (getTile(state.map, target.x, target.y) === 'stairs') {
    addMessage(state, 'Ты нашёл лестницу вниз! Спуск на следующий этаж появится в v0.4.');
  }
  monstersAct(state);
  return true;
}
