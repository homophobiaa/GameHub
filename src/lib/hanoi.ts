import type { RodId, Rods } from "@/types";

/**
 * Create a fresh Tower of Hanoi state for `discCount` discs.
 * All discs start on rod 0, bottom-to-top with size N at the bottom.
 */
export function createInitialRods(discCount: number): Rods {
  const first: number[] = [];
  for (let s = discCount; s >= 1; s--) first.push(s);
  return [first, [], []];
}

export const TARGET_ROD: RodId = 2;

export function topDisc(rod: number[]): number | null {
  return rod.length === 0 ? null : rod[rod.length - 1];
}

export function canMove(rods: Rods, from: RodId, to: RodId): boolean {
  if (from === to) return false;
  const src = rods[from];
  const dst = rods[to];
  if (src.length === 0) return false;
  const moving = src[src.length - 1];
  const top = dst.length === 0 ? Infinity : dst[dst.length - 1];
  return moving < top;
}

/**
 * Apply a move, returning a NEW rods structure. Caller must validate via canMove.
 */
export function applyMove(rods: Rods, from: RodId, to: RodId): Rods {
  const next: Rods = [rods[0].slice(), rods[1].slice(), rods[2].slice()];
  const disc = next[from].pop()!;
  next[to].push(disc);
  return next;
}

/**
 * Solved when all discs are stacked, in order, on the target rod.
 */
export function isSolved(rods: Rods, discCount: number): boolean {
  const target = rods[TARGET_ROD];
  if (target.length !== discCount) return false;
  for (let i = 0; i < discCount; i++) {
    if (target[i] !== discCount - i) return false;
  }
  return true;
}

/**
 * Progress at timeout: fraction of discs correctly stacked from the BOTTOM
 * of the target rod (size N, then N-1, ...). Used only for partial scoring.
 */
export function targetRodProgress(rods: Rods, discCount: number): number {
  const target = rods[TARGET_ROD];
  let correct = 0;
  for (let i = 0; i < target.length; i++) {
    if (target[i] === discCount - i) correct++;
    else break;
  }
  return correct / discCount;
}
