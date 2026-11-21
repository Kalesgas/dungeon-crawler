import './style.css';
import { createGame, movePlayer, waitTurn, type Direction, type GameState } from './game';
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

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`На странице нет элемента ${selector}`);
  }
  return found;
}

const canvas = element<HTMLCanvasElement>('#game');
const logElement = element<HTMLUListElement>('#log');
const seedElement = element<HTMLSpanElement>('#seed');
const hud = {
  hpFill: element<HTMLDivElement>('#hp-fill'),
  hpText: element<HTMLSpanElement>('#hp-text'),
  attack: element<HTMLSpanElement>('#attack'),
  defense: element<HTMLSpanElement>('#defense'),
  floor: element<HTMLSpanElement>('#floor'),
  kills: element<HTMLSpanElement>('#kills'),
};

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

// Сид можно передать в адресе: ?seed=12345 — откроется то же самое подземелье.
const urlSeed = Number(new URLSearchParams(window.location.search).get('seed'));
let state: GameState = createGame(Number.isInteger(urlSeed) && urlSeed > 0 ? urlSeed : randomSeed());
let ctx = setupCanvas(canvas, state);

function updateHud(): void {
  const { player } = state;
  const ratio = player.hp / player.maxHp;
  hud.hpFill.style.width = `${ratio * 100}%`;
  hud.hpFill.classList.toggle('mid', ratio <= 0.6 && ratio > 0.3);
  hud.hpFill.classList.toggle('low', ratio <= 0.3);
  hud.hpText.textContent = `${player.hp} / ${player.maxHp}`;
  hud.attack.textContent = String(player.attack);
  hud.defense.textContent = String(player.defense);
  hud.floor.textContent = String(state.floor);
  hud.kills.textContent = String(state.kills);
}

function updateUi(): void {
  render(ctx, state);
  updateHud();
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

  if (event.code === 'Space') {
    event.preventDefault(); // чтобы пробел не прокручивал страницу
    if (waitTurn(state)) {
      updateUi();
    }
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
