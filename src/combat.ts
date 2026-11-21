import { randInt, type Rng } from './rng';

/**
 * Урон от удара: атака минус защита, плюс разброс ±1.
 * Минимум 1 — даже самый слабый удар хоть немного ранит.
 */
export function rollDamage(attack: number, defense: number, rng: Rng): number {
  return Math.max(1, attack - defense + randInt(rng, -1, 1));
}
