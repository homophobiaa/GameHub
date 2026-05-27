import type { Difficulty, DifficultyConfig } from "@/types";

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    discs: 3,
    baseScore: 1000,
    multiplier: 1.0,
    tagline: "Lowest risk, lowest score potential",
    description:
      "3 discs. A gentle introduction. Perfect for warming up — but your score ceiling is the lowest.",
  },
  medium: {
    id: "medium",
    label: "Medium",
    discs: 4,
    baseScore: 2200,
    multiplier: 1.65,
    tagline: "Balanced — moderate risk, solid reward",
    description:
      "4 discs. A balanced challenge with meaningfully higher score potential than Easy.",
  },
  hard: {
    id: "hard",
    label: "Hard",
    discs: 5,
    baseScore: 4000,
    multiplier: 2.5,
    tagline: "Highest risk, highest score potential",
    description:
      "5 discs. The summit. Only clean, fast solves will produce top leaderboard scores.",
  },
};

export const DIFFICULTY_LIST: DifficultyConfig[] = [
  DIFFICULTIES.easy,
  DIFFICULTIES.medium,
  DIFFICULTIES.hard,
];

export const ROUND_DURATION_MS = 5 * 60 * 1000; // exactly 5 minutes
export const ROUND_DURATION_S = 300;

export function minMovesForDiscs(discs: number): number {
  return Math.pow(2, discs) - 1;
}
