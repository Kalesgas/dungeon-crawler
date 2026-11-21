import type { GameState } from './game';
import { getTile, isWallVisible, type Tile } from './map';
import { MONSTER_TEMPLATES } from './monsters';

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

  for (const monster of state.monsters) {
    const template = MONSTER_TEMPLATES[monster.kind];
    ctx.fillStyle = TILE_STYLE.floor.background;
    ctx.fillRect(monster.x * TILE_SIZE, monster.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    drawGlyph(ctx, monster.x, monster.y, template.glyph, template.color);
  }

  ctx.fillStyle = TILE_STYLE.floor.background;
  ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  drawGlyph(ctx, player.x, player.y, state.gameOver ? '%' : PLAYER_GLYPH, state.gameOver ? '#8a2a22' : PLAYER_COLOR);

  if (state.gameOver) {
    drawGameOver(ctx, state);
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState): void {
  const width = state.map.width * TILE_SIZE;
  const height = state.map.height * TILE_SIZE;
  const font = ctx.font;

  ctx.fillStyle = 'rgba(8, 7, 11, 0.8)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#d9483b';
  ctx.font = `bold ${TILE_SIZE * 3}px ui-monospace, Consolas, monospace`;
  ctx.fillText('GAME OVER', width / 2, height / 2 - TILE_SIZE * 2);

  ctx.fillStyle = '#d8d4e3';
  ctx.font = `${TILE_SIZE}px ui-monospace, Consolas, monospace`;
  ctx.fillText(`Ходов: ${state.turn} · Убито монстров: ${state.kills}`, width / 2, height / 2 + TILE_SIZE);
  ctx.fillStyle = '#f2c14e';
  ctx.fillText('Нажми R, чтобы начать заново', width / 2, height / 2 + TILE_SIZE * 3);

  ctx.font = font;
}
