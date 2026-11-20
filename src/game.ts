import { generateDungeon, getTile, isWalkable, roomCenter, type DungeonMap, type Position } from './map';
import { createRng } from './rng';

export const MAP_WIDTH = 60;
export const MAP_HEIGHT = 36;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  seed: number;
  map: DungeonMap;
  player: Position;
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
    map,
    player: roomCenter(map.rooms[0]),
    log: ['Ты спускаешься в подземелье. Найди лестницу вниз.'],
  };
}

export function addMessage(state: GameState, message: string): void {
  state.log.unshift(message);
  state.log.length = Math.min(state.log.length, 5);
}

/** Пытается сдвинуть героя. Возвращает true, если шаг получился. */
export function movePlayer(state: GameState, direction: Direction): boolean {
  const delta = DIRECTION_DELTAS[direction];
  const target = { x: state.player.x + delta.x, y: state.player.y + delta.y };

  if (!isWalkable(state.map, target.x, target.y)) {
    return false;
  }

  state.player = target;
  if (getTile(state.map, target.x, target.y) === 'stairs') {
    addMessage(state, 'Ты нашёл лестницу вниз! Спуск на следующий этаж появится в v0.4.');
  }
  return true;
}
