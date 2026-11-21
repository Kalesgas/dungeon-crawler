import type { GameState } from './game';
import { getTile, isWallVisible, type Tile } from './map';

export const TILE_SIZE = 16;

/** Цвет сплошной скалы — стен, до которых не дотянуться. */
const ROCK_COLOR = '#08070b';

const TILE_STYLE: Record<Tile, { background: string; glyph: string; color: string }> = {
  wall: { background: '#1f1c26', glyph: '#', color: '#3d3849' },
  floor: { background: '#0e0d12', glyph: '·', color: '#2e2b38' },
  stairs: { background: '#0e0d12', glyph: '>', color: '#6fc3df' },
};

const PLAYER_GLYPH = '@';
const PLAYER_COLOR = '#f2c14e';

export function setupCanvas(canvas: HTMLCanvasElement, state: GameState): CanvasRenderingContext2D {
  const ratio = window.devicePixelRatio || 1;
  const width = state.map.width * TILE_SIZE;
  const height = state.map.height * TILE_SIZE;

  // Рисуем в повышенном разрешении, чтобы символы были чёткими на HiDPI-экранах.
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D не поддерживается этим браузером');
  }
  ctx.scale(ratio, ratio);
  ctx.font = `${TILE_SIZE}px ui-monospace, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  return ctx;
}

function drawGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, glyph: string, color: string): void {
  ctx.fillStyle = color;
  ctx.fillText(glyph, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2 + 1);
}

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { map, player } = state;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = getTile(map, x, y);
      if (tile === 'wall' && !isWallVisible(map, x, y)) {
        ctx.fillStyle = ROCK_COLOR;
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        continue;
      }
      const style = TILE_STYLE[tile];
      ctx.fillStyle = style.background;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      drawGlyph(ctx, x, y, style.glyph, style.color);
    }
  }

  ctx.fillStyle = TILE_STYLE.floor.background;
  ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  drawGlyph(ctx, player.x, player.y, PLAYER_GLYPH, PLAYER_COLOR);
}
