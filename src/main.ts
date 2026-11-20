import './style.css';
import { createGame, movePlayer, type Direction, type GameState } from './game';
import { render, setupCanvas } from './render';

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const logElement = document.querySelector<HTMLUListElement>('#log')!;
const seedElement = document.querySelector<HTMLSpanElement>('#seed')!;

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

// Сид можно передать в адресе: ?seed=12345 — откроется то же самое подземелье.
const urlSeed = Number(new URLSearchParams(window.location.search).get('seed'));
let state: GameState = createGame(Number.isInteger(urlSeed) && urlSeed > 0 ? urlSeed : randomSeed());
let ctx = setupCanvas(canvas, state);

function updateUi(): void {
  render(ctx, state);
  seedElement.textContent = String(state.seed);
  logElement.replaceChildren(
    ...state.log.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR') {
    state = createGame(randomSeed());
    ctx = setupCanvas(canvas, state);
    updateUi();
    return;
  }

  const direction = KEY_TO_DIRECTION[event.code];
  if (!direction) {
    return;
  }
  event.preventDefault(); // чтобы стрелки не прокручивали страницу
  if (movePlayer(state, direction)) {
    updateUi();
  }
});

updateUi();
