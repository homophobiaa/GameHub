import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Timer, LogOut } from "lucide-react";
import { useCallback, useEffect } from "react";
import { GameBoard } from "@/components/game/GameBoard";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DIFFICULTIES, ROUND_DURATION_MS } from "@/lib/difficulty";
import { formatMs } from "@/lib/format";
import { SFX } from "@/lib/audio";
import { useGame } from "@/hooks/useGame";
import type { Difficulty } from "@/types";

interface Props {
  playerName: string;
  difficulty: Difficulty;
  onComplete: (result: GameResult) => void;
}

export interface GameResult {
  difficulty: Difficulty;
  discs: number;
  moves: number;
  minMoves: number;
  remainingMs: number;
  elapsedMs: number;
  solved: boolean;
  progressPercent: number;
  efficiency: number;
  reason: "solved" | "timeout" | "quit";
}

export function GameScreen({ playerName, difficulty, onComplete }: Props) {
  const game = useGame(difficulty);
  const cfg = DIFFICULTIES[difficulty];

  const fireComplete = useCallback(
    (reason: GameResult["reason"]) => {
      onComplete({
        difficulty: game.difficulty,
        discs: game.discCount,
        moves: game.moves,
        minMoves: game.minMoves,
        remainingMs: game.remainingMs,
        elapsedMs: game.elapsedMs,
        solved: game.phase === "won",
        progressPercent: game.progressPercent,
        efficiency: game.efficiency,
        reason,
      });
    },
    [game, onComplete]
  );

  // Auto-advance when round ends naturally.
  useEffect(() => {
    if (game.phase === "won" || game.phase === "timeout") {
      const delay = game.phase === "won" ? 1400 : 900;
      const t = setTimeout(() => {
        fireComplete(game.phase === "won" ? "solved" : "timeout");
      }, delay);
      return () => clearTimeout(t);
    }
  }, [game.phase, fireComplete]);

  const timerLow = game.remainingMs <= 30_000 && game.phase === "running";
  const timerCritical = game.remainingMs <= 10_000 && game.phase === "running";
  const timerStarted = game.startedAt != null;
  const gameOver = game.phase === "won" || game.phase === "timeout";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col min-h-screen"
    >
      {/* ── Compact HUD ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Player + difficulty */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="chip min-w-0 truncate max-w-[140px]">
              <span className="h-1.5 w-1.5 rounded-full bg-royale-mint flex-shrink-0" />
              <span className="truncate">{playerName}</span>
            </span>
            <span className="chip flex-shrink-0">
              {cfg.label} · ×{cfg.multiplier.toFixed(2)}
            </span>
          </div>

          {/* Timer */}
          <motion.div
            animate={
              timerCritical
                ? { scale: [1, 1.07, 1] }
                : timerLow
                  ? { scale: [1, 1.03, 1] }
                  : { scale: 1 }
            }
            transition={{
              duration: timerCritical ? 0.65 : 1.1,
              repeat: timerLow ? Infinity : 0,
              ease: "easeInOut",
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-mono transition ${
              timerCritical
                ? "border-rose-400/50 bg-rose-500/15 text-rose-100"
                : timerLow
                  ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
                  : "border-white/10 bg-white/[0.06] text-white/85"
            }`}
          >
            <Timer className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="tabular-nums">
              {timerStarted ? formatMs(game.remainingMs) : formatMs(ROUND_DURATION_MS)}
            </span>
          </motion.div>

          {/* Moves */}
          <div className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.06] text-sm tabular-nums text-white/80 flex-shrink-0">
            <span className="text-white/45 mr-1">Moves</span>
            {game.moves}
          </div>

          {/* Score preview */}
          <div className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.06] text-sm flex-shrink-0">
            <span className="text-white/45 mr-1">Score</span>
            <AnimatedNumber value={game.scorePreview} className="font-display tracking-tight" />
          </div>
        </div>
      </div>

      {/* ── Instruction strip ── */}
      <div className="flex-shrink-0 px-4 pb-2 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[12px] text-white/40 leading-relaxed">
            <span className="text-white/60">Move all discs from the left tower to the right tower.</span>
            {" "}Only one disc at a time — bigger discs cannot sit on smaller ones.
            {" "}<span className="text-white/35">Click a disc to pick it up, then click a tower to place it.</span>
          </p>
        </div>
      </div>

      {/* ── Board (dominant) ── */}
      <div className="flex-1 flex flex-col px-3 sm:px-6">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          <div className="flex-1 glass-card gradient-border p-3 sm:p-5 flex flex-col">
            <GameBoard
              rods={game.rods}
              discCount={game.discCount}
              selectedRod={game.selectedRod}
              invalidRod={game.invalidRod}
              invalidNonce={game.invalidNonce}
              disabled={gameOver}
              onRodClick={game.handleRodClick}
              onDragMove={(from, to) => game.tryMove(from, to)}
              boardHeight={440}
            />

            {/* Invalid move message */}
            <AnimatePresence>
              {game.invalidNonce > 0 && !gameOver && (
                <motion.p
                  key={game.invalidNonce}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 text-center text-[12px] text-rose-300/80"
                >
                  Bigger discs cannot go on smaller discs.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Bottom action bar ── */}
      <div className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              SFX.click();
              fireComplete("quit");
            }}
            disabled={gameOver}
            className="btn-ghost text-white/50 hover:text-white/80 disabled:opacity-30 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Quit
          </button>

          <button
            aria-label="Restart round"
            onClick={() => {
              SFX.click();
              game.reset();
            }}
            disabled={gameOver}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-30"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Win celebration overlay ── */}
      <AnimatePresence>
        {game.phase === "won" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="glass-strong gradient-border rounded-3xl px-10 py-8 text-center"
              style={{ boxShadow: "0 0 60px rgba(245,196,81,0.3)" }}
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                Solved!
              </div>
              <div className="mt-1 font-display text-4xl gradient-text">
                Tower Complete
              </div>
              <div className="text-white/55 text-sm mt-2">Tallying your score…</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Timeout overlay ── */}
      <AnimatePresence>
        {game.phase === "timeout" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="glass-strong rounded-3xl border border-rose-400/25 px-10 py-8 text-center"
              style={{ background: "rgba(220,38,38,0.08)" }}
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-rose-200/70">
                Time's up
              </div>
              <div className="mt-1 font-display text-4xl text-rose-100">Time's Up</div>
              <div className="text-white/45 text-sm mt-2">Calculating partial score…</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
