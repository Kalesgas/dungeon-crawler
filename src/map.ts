import { randInt, type Rng } from './rng';

export type Tile = 'wall' | 'floor' | 'stairs';

export interface Position {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DungeonMap {
  width: number;
  height: number;
  /** Клетки карты построчно: индекс клетки (x, y) равен y * width + x. */
  tiles: Tile[];
  rooms: Room[];
}

export interface DungeonOptions {
  maxRooms: number;
  minRoomSize: number;
  maxRoomSize: number;
}

export const DEFAULT_DUNGEON_OPTIONS: DungeonOptions = {
  maxRooms: 14,
  minRoomSize: 4,
  maxRoomSize: 10,
};

export function getTile(map: DungeonMap, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return 'wall';
  }
  return map.tiles[y * map.width + x];
}

function setTile(map: DungeonMap, x: number, y: number, tile: Tile): void {
  map.tiles[y * map.width + x] = tile;
}

export function isWalkable(map: DungeonMap, x: number, y: number): boolean {
  return getTile(map, x, y) !== 'wall';
}

export function roomCenter(room: Room): Position {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

/** Пересекаются ли комнаты (с зазором в одну клетку, чтобы стены не слипались). */
function roomsOverlap(a: Room, b: Room): boolean {
  return (
    a.x - 1 < b.x + b.width &&
    a.x + a.width + 1 > b.x &&
    a.y - 1 < b.y + b.height &&
    a.y + a.height + 1 > b.y
  );
}

function carveRoom(map: DungeonMap, room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      setTile(map, x, y, 'floor');
    }
  }
}

function carveHorizontal(map: DungeonMap, x1: number, x2: number, y: number): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    setTile(map, x, y, 'floor');
  }
}

function carveVertical(map: DungeonMap, y1: number, y2: number, x: number): void {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
    setTile(map, x, y, 'floor');
  }
}

/** Г-образный коридор между двумя точками: случайно выбираем, куда сначала. */
function carveCorridor(map: DungeonMap, from: Position, to: Position, rng: Rng): void {
  if (rng() < 0.5) {
    carveHorizontal(map, from.x, to.x, from.y);
    carveVertical(map, from.y, to.y, to.x);
  } else {
    carveVertical(map, from.y, to.y, from.x);
    carveHorizontal(map, from.x, to.x, to.y);
  }
}

/**
 * Генерирует подземелье: случайные непересекающиеся комнаты,
 * каждая соединена коридором с предыдущей. В последней комнате — лестница вниз.
 */
export function generateDungeon(
  width: number,
  height: number,
  rng: Rng,
  options: DungeonOptions = DEFAULT_DUNGEON_OPTIONS,
): DungeonMap {
  const map: DungeonMap = {
    width,
    height,
    tiles: new Array<Tile>(width * height).fill('wall'),
    rooms: [],
  };

  const attempts = options.maxRooms * 5;
  for (let i = 0; i < attempts && map.rooms.length < options.maxRooms; i++) {
    const roomWidth = randInt(rng, options.minRoomSize, options.maxRoomSize);
    const roomHeight = randInt(rng, options.minRoomSize, Math.ceil(options.maxRoomSize * 0.7));
    // Отступ в 1 клетку от края, чтобы по периметру всегда была стена.
    const room: Room = {
      x: randInt(rng, 1, width - roomWidth - 2),
      y: randInt(rng, 1, height - roomHeight - 2),
      width: roomWidth,
      height: roomHeight,
    };

    if (map.rooms.some((other) => roomsOverlap(room, other))) {
      continue;
    }

    carveRoom(map, room);
    const previous = map.rooms[map.rooms.length - 1];
    if (previous) {
      carveCorridor(map, roomCenter(previous), roomCenter(room), rng);
    }
    map.rooms.push(room);
  }

  const lastRoom = map.rooms[map.rooms.length - 1];
  const stairs = roomCenter(lastRoom);
  setTile(map, stairs.x, stairs.y, 'stairs');

  return map;
}
