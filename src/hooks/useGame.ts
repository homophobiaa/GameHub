import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  applyMove,
  canMove,
  createInitialRods,
  isSolved,
  targetRodProgress,
} from "@/lib/hanoi";
import { DIFFICULTIES, ROUND_DURATION_MS, minMovesForDiscs } from "@/lib/difficulty";
import { previewScore } from "@/lib/scoring";
import type { Difficulty, RodId, Rods } from "@/types";
import { SFX } from "@/lib/audio";

export type GamePhase = "idle" | "running" | "won" | "timeout";

interface GameState {
  difficulty: Difficulty;
  discCount: number;
  rods: Rods;
  moves: number;
  phase: GamePhase;
  startedAt: number | null;
  endedAt: number | null;
  selectedRod: RodId | null;
  invalidRod: RodId | null;
  invalidNonce: number;
  lastMovedDisc: number | null;
}

type Action =
  | { type: "reset"; difficulty: Difficulty }
  | { type: "select"; rod: RodId | null }
  | { type: "move"; from: RodId; to: RodId; now: number }
  | { type: "invalid"; rod: RodId }
  | { type: "timeout"; now: number };

function init(difficulty: Difficulty): GameState {
  const cfg = DIFFICULTIES[difficulty];
  return {
    difficulty,
    discCount: cfg.discs,
    rods: createInitialRods(cfg.discs),
    moves: 0,
    phase: "idle",
    startedAt: null,
    endedAt: null,
    selectedRod: null,
    invalidRod: null,
    invalidNonce: 0,
    lastMovedDisc: null,
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "reset":
      return init(action.difficulty);
    case "select":
      return { ...state, selectedRod: action.rod };
    case "invalid":
      return {
        ...state,
        invalidRod: action.rod,
        invalidNonce: state.invalidNonce + 1,
        selectedRod: null,
      };
    case "move": {
      if (state.phase === "won" || state.phase === "timeout") return state;
      if (!canMove(state.rods, action.from, action.to)) return state;
      const movingDisc = state.rods[action.from][state.rods[action.from].length - 1];
      const nextRods = applyMove(state.rods, action.from, action.to);
      const solved = isSolved(nextRods, state.discCount);
      const startedAt = state.startedAt ?? action.now;
      const endedAt = solved ? action.now : state.endedAt;
      return {
        ...state,
        rods: nextRods,
        moves: state.moves + 1,
        phase: solved ? "won" : "running",
        startedAt,
        endedAt,
        selectedRod: null,
        lastMovedDisc: movingDisc,
      };
    }
    case "timeout":
      if (state.phase !== "running" && state.phase !== "idle") return state;
      return { ...state, phase: "timeout", endedAt: action.now, selectedRod: null };
  }
}

export interface GameAPI {
  difficulty: Difficulty;
  discCount: number;
  rods: Rods;
  moves: number;
  minMoves: number;
  phase: GamePhase;
  startedAt: number | null;
  endedAt: number | null;
  selectedRod: RodId | null;
  invalidRod: RodId | null;
  invalidNonce: number;
  lastMovedDisc: number | null;
  remainingMs: number;
  elapsedMs: number;
  efficiency: number;
  progressPercent: number;
  scorePreview: number;
  reset: (difficulty?: Difficulty) => void;
  selectRod: (rod: RodId) => void;
  tryMove: (from: RodId, to: RodId) => boolean;
  /** Click-to-select & click-to-move. Returns true if a move occurred. */
  handleRodClick: (rod: RodId) => boolean;
}

export function useGame(initialDifficulty: Difficulty): GameAPI {
  const [state, dispatch] = useReducer(reducer, initialDifficulty, init);
  const [now, setNow] = useState<number>(() => Date.now());
  const rafRef = useRef<number | null>(null);

  const minMoves = useMemo(() => minMovesForDiscs(state.discCount), [state.discCount]);

  // Drive a tick while game is running so timer / preview update.
  useEffect(() => {
    if (state.phase !== "running") return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setNow(Date.now());
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [state.phase]);

  // Timeout detection.
  useEffect(() => {
    if (state.phase !== "running" || state.startedAt == null) return;
    const elapsed = now - state.startedAt;
    if (elapsed >= ROUND_DURATION_MS) {
      SFX.timeout();
      dispatch({ type: "timeout", now: state.startedAt + ROUND_DURATION_MS });
    }
  }, [now, state.phase, state.startedAt]);

  const elapsedMs =
    state.startedAt == null
      ? 0
      : (state.endedAt ?? now) - state.startedAt;
  const remainingMs = Math.max(0, ROUND_DURATION_MS - elapsedMs);
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  const efficiency = state.moves > 0 ? Math.min(1, minMoves / state.moves) : 0;
  const progressPercent = targetRodProgress(state.rods, state.discCount);

  const scorePreview = useMemo(
    () =>
      previewScore({
        difficulty: state.difficulty,
        discs: state.discCount,
        moves: state.moves,
        remainingSeconds,
        solved: state.phase === "won",
        progressPercent,
      }),
    [state.difficulty, state.discCount, state.moves, remainingSeconds, state.phase, progressPercent]
  );

  const reset = useCallback((difficulty?: Difficulty) => {
    dispatch({ type: "reset", difficulty: difficulty ?? state.difficulty });
  }, [state.difficulty]);

  const selectRod = useCallback((rod: RodId) => {
    dispatch({ type: "select", rod });
  }, []);

  const tryMove = useCallback(
    (from: RodId, to: RodId): boolean => {
      if (from === to) {
        dispatch({ type: "select", rod: null });
        return false;
      }
      if (canMove(state.rods, from, to)) {
        SFX.drop();
        dispatch({ type: "move", from, to, now: Date.now() });
        return true;
      }
      SFX.invalid();
      dispatch({ type: "invalid", rod: to });
      return false;
    },
    [state.rods]
  );

  const handleRodClick = useCallback(
    (rod: RodId): boolean => {
      if (state.phase === "won" || state.phase === "timeout") return false;
      if (state.selectedRod == null) {
        if (state.rods[rod].length === 0) {
          SFX.invalid();
          dispatch({ type: "invalid", rod });
          return false;
        }
        SFX.pickup();
        dispatch({ type: "select", rod });
        return false;
      }
      if (state.selectedRod === rod) {
        dispatch({ type: "select", rod: null });
        return false;
      }
      return tryMove(state.selectedRod, rod);
    },
    [state.phase, state.selectedRod, state.rods, tryMove]
  );

  // Win sound
  useEffect(() => {
    if (state.phase === "won") SFX.win();
  }, [state.phase]);

  return {
    difficulty: state.difficulty,
    discCount: state.discCount,
    rods: state.rods,
    moves: state.moves,
    minMoves,
    phase: state.phase,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    selectedRod: state.selectedRod,
    invalidRod: state.invalidRod,
    invalidNonce: state.invalidNonce,
    lastMovedDisc: state.lastMovedDisc,
    remainingMs,
    elapsedMs,
    efficiency,
    progressPercent,
    scorePreview,
    reset,
    selectRod,
    tryMove,
    handleRodClick,
  };
}
