export type Difficulty = "easy" | "medium" | "hard";

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  discs: number;
  baseScore: number;
  multiplier: number;
  description: string;
  tagline: string;
}

export type RodId = 0 | 1 | 2;

/**
 * Each rod is an array of disc sizes, ordered bottom -> top.
 * Disc sizes are 1..N (1 = smallest).
 */
export type Rods = [number[], number[], number[]];

export interface GameSnapshot {
  rods: Rods;
  discCount: number;
  difficulty: Difficulty;
  moves: number;
  startedAt: number | null; // ms, null until first move
  endedAt: number | null;
  elapsedMs: number; // accumulates if paused (not used currently)
  solved: boolean;
  timedOut: boolean;
}

export interface ScoreBreakdown {
  baseScore: number;
  moveEfficiency: number; // 0..1
  efficiencyPoints: number;
  timeBonus: number;
  completionBonus: number;
  difficultyMultiplier: number;
  preMultiplier: number;
  finalScore: number;
  progressPercent: number; // 0..1, used when not solved
  solved: boolean;
}

export interface ScoreRecord {
  id: string;
  playerId: string;
  playerName: string;
  difficulty: Difficulty;
  discs: number;
  score: number;
  moves: number;
  minMoves: number;
  efficiency: number; // 0..1
  timeUsedMs: number;
  timeLeftMs: number;
  solved: boolean;
  createdAt: number; // epoch ms
}

export interface PlayerProfile {
  id: string;
  name: string;
  createdAt: number;
  lastPlayedAt: number;
}

export interface AppSettings {
  muted: boolean;
}

export type ScreenId =
  | "menu"
  | "new-player"
  | "game"
  | "result"
  | "leaderboard"
  | "profiles"
  | "scoring";
