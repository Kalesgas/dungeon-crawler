/**
 * Генератор псевдослучайных чисел с сидом (алгоритм mulberry32).
 *
 * Зачем свой, а не Math.random()? Один и тот же сид всегда даёт одну и ту же
 * последовательность чисел. Значит, одно и то же подземелье можно воспроизвести:
 * это нужно для тестов и чтобы делиться интересными картами.
 */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Случайное целое число от min до max включительно. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
