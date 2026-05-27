import { DIFFICULTIES, ROUND_DURATION_S, minMovesForDiscs } from "@/lib/difficulty";
import type { Difficulty, ScoreBreakdown } from "@/types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface ScoreInput {
  difficulty: Difficulty;
  discs: number;
  moves: number;
  remainingSeconds: number; // 0..300
  solved: boolean;
  progressPercent: number; // 0..1, used only when not solved
}

/**
 * Pure, transparent scoring. Mirrors the formula shown on the Scoring page.
 *
 *   minimumMoves       = 2^discCount - 1
 *   moveEfficiency     = clamp(minimumMoves / actualMoves, 0, 1)
 *   timeBonus          = baseScore * 0.4 * (remainingSeconds / 300)
 *   completionBonus    = baseScore * 0.25   (solved only)
 *
 *   finalScore =
 *     solved:    round((baseScore * moveEfficiency + timeBonus + completionBonus) * difficultyMultiplier)
 *     unsolved:  round((baseScore * 0.15 * progressPercent) * difficultyMultiplier)
 */
export function computeScore(input: ScoreInput): ScoreBreakdown {
  const cfg = DIFFICULTIES[input.difficulty];
  const baseScore = cfg.baseScore;
  const difficultyMultiplier = cfg.multiplier;
  const minMoves = minMovesForDiscs(input.discs);

  const moveEfficiency =
    input.moves > 0 ? clamp01(minMoves / input.moves) : 0;
  const efficiencyPoints = baseScore * moveEfficiency;

  const timeBonus =
    baseScore * 0.4 * clamp01(input.remainingSeconds / ROUND_DURATION_S);

  const completionBonus = input.solved ? baseScore * 0.25 : 0;

  let preMultiplier: number;
  if (input.solved) {
    preMultiplier = efficiencyPoints + timeBonus + completionBonus;
  } else {
    preMultiplier = baseScore * 0.15 * clamp01(input.progressPercent);
  }

  const finalScore = Math.round(preMultiplier * difficultyMultiplier);

  return {
    baseScore,
    moveEfficiency,
    efficiencyPoints,
    timeBonus,
    completionBonus,
    difficultyMultiplier,
    preMultiplier,
    finalScore,
    progressPercent: input.progressPercent,
    solved: input.solved,
  };
}

/**
 * Live score preview during play (always treats progress as solved=false unless
 * the puzzle is currently solved). Useful for the top bar.
 */
export function previewScore(input: ScoreInput): number {
  return computeScore(input).finalScore;
}
