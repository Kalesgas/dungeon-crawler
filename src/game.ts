import { rollDamage } from './combat';
import { generateDungeon, getTile, isWalkable, roomCenter, type DungeonMap, type Position } from './map';
import { canSee, MONSTER_TEMPLATES, nextStepToward, spawnMonsters, type Monster } from './monsters';
import { createRng, type Rng } from './rng';

export const MAP_WIDTH = 60;
export const MAP_HEIGHT = 36;

/** Каждые столько ходов герой восстанавливает 1 единицу здоровья. */
export const REGEN_INTERVAL = 8;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Player extends Position {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface GameState {
  seed: number;
  rng: Rng;
  map: DungeonMap;
  player: Player;
  monsters: Monster[];
  floor: number;
  turn: number;
  kills: number;
  gameOver: boolean;
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
    player: { ...roomCenter(map.rooms[0]), hp: 30, maxHp: 30, attack: 5, defense: 2 },
    monsters: spawnMonsters(map, rng),
    floor: 1,
    turn: 0,
    kills: 0,
    gameOver: false,
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

function playerAttacks(state: GameState, monster: Monster): void {
  const template = MONSTER_TEMPLATES[monster.kind];
  const damage = rollDamage(state.player.attack, template.defense, state.rng);
  monster.hp -= damage;

  if (monster.hp <= 0) {
    state.monsters = state.monsters.filter((other) => other !== monster);
    state.kills += 1;
    addMessage(state, `Ты бьёшь ${template.nameAccusative} на ${damage}. ${template.name} погибает!`);
  } else {
    addMessage(state, `Ты бьёшь ${template.nameAccusative} на ${damage}.`);
  }
}

function monsterAttacks(state: GameState, monster: Monster): void {
  const template = MONSTER_TEMPLATES[monster.kind];
  const damage = rollDamage(template.attack, state.player.defense, state.rng);
  state.player.hp = Math.max(0, state.player.hp - damage);
  addMessage(state, `${template.name} бьёт тебя на ${damage}.`);

  if (state.player.hp === 0) {
    state.gameOver = true;
    addMessage(state, `Ты погиб. Тебя убил ${template.name.toLowerCase()}.`);
  }
}

/** Ход монстров: замечают героя, идут к нему, а рядом с ним — атакуют. */
export function monstersAct(state: GameState): void {
  for (const monster of state.monsters) {
    if (state.gameOver) {
      return;
    }
    const template = MONSTER_TEMPLATES[monster.kind];

    if (canSee(state.map, monster, state.player, template.sightRange)) {
      if (!monster.target) {
        addMessage(state, `${template.name} замечает тебя!`);
      }
      monster.target = { x: state.player.x, y: state.player.y };
    }

    if (isAdjacent(monster, state.player) && monster.target) {
      monsterAttacks(state, monster);
      continue;
    }
    if (!monster.target) {
      continue; // героя не видел — стоит на месте
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

/** Конец хода героя: регенерация, затем ходят монстры. */
function endTurn(state: GameState): void {
  state.turn += 1;
  if (state.turn % REGEN_INTERVAL === 0 && state.player.hp < state.player.maxHp) {
    state.player.hp += 1;
  }
  monstersAct(state);
}

/**
 * Действие героя в сторону: шаг на свободную клетку или удар по монстру.
 * Возвращает true, если ход сделан (и ход перешёл монстрам).
 */
export function movePlayer(state: GameState, direction: Direction): boolean {
  if (state.gameOver) {
    return false;
  }
  const delta = DIRECTION_DELTAS[direction];
  const target = { x: state.player.x + delta.x, y: state.player.y + delta.y };

  const monster = monsterAt(state, target.x, target.y);
  if (monster) {
    playerAttacks(state, monster);
    endTurn(state);
    return true;
  }
  if (!isWalkable(state.map, target.x, target.y)) {
    return false;
  }

  state.player.x = target.x;
  state.player.y = target.y;
  if (getTile(state.map, target.x, target.y) === 'stairs') {
    addMessage(state, 'Ты нашёл лестницу вниз! Спуск на следующий этаж появится в v0.4.');
  }
  endTurn(state);
  return true;
}

/** Пропустить ход: стоять на месте и ждать (монстры при этом ходят). */
export function waitTurn(state: GameState): boolean {
  if (state.gameOver) {
    return false;
  }
  endTurn(state);
  return true;
}
