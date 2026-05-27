import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Timer } from "lucide-react";
import { useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { GameBoard } from "@/components/game/GameBoard";
import { HintArea } from "@/components/game/HintArea";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DIFFICULTIES, ROUND_DURATION_MS } from "@/lib/difficulty";
import { formatMs, formatPercent } from "@/lib/format";
import { SFX } from "@/lib/audio";
import { useGame } from "@/hooks/useGame";
import type { Difficulty, PlayerProfile } from "@/types";

interface Props {
  player: PlayerProfile;
  difficulty: Difficulty;
  onComplete: (result: GameResult) => void;
  onBack: () => void;
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
}

export function GameScreen({ player, difficulty, onComplete, onBack }: Props) {
  const game = useGame(difficulty);
  const cfg = DIFFICULTIES[difficulty];

  // Auto-advance when round ends.
  useEffect(() => {
    if (game.phase === "won" || game.phase === "timeout") {
      const t = setTimeout(() => {
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
        });
      }, game.phase === "won" ? 1200 : 800);
      return () => clearTimeout(t);
    }
  }, [game.phase, game, onComplete]);

  const timerLow = game.remainingMs <= 30_000 && game.phase === "running";
  const timerCritical = game.remainingMs <= 10_000 && game.phase === "running";
  const timerStarted = game.startedAt != null;

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 justify-between mb-4 sm:mb-6">
          <button
            onClick={() => {
              SFX.click();
              onBack();
            }}
            className="btn-ghost"
          >
            <ArrowLeft className="h-4 w-4" /> Quit
          </button>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-royale-mint" />
              {player.name}
            </span>
            <span className="chip">{cfg.label} · {cfg.discs} discs</span>
            <span className="chip">×{cfg.multiplier.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              animate={
                timerCritical
                  ? { scale: [1, 1.06, 1] }
                  : timerLow
                    ? { scale: [1, 1.03, 1] }
                    : { scale: 1 }
              }
              transition={{
                duration: timerCritical ? 0.7 : 1.2,
                repeat: timerLow ? Infinity : 0,
                ease: "easeInOut",
              }}
              className={`glass-card px-4 py-2 flex items-center gap-2 ${
                timerLow ? "border-rose-300/30 bg-rose-400/[0.08]" : ""
              }`}
            >
              <Timer
                className={`h-4 w-4 ${timerLow ? "text-rose-200" : "text-white/70"}`}
              />
              <span
                className={`font-mono text-lg tracking-tight ${
                  timerLow ? "text-rose-100" : ""
                }`}
              >
                {timerStarted ? formatMs(game.remainingMs) : formatMs(ROUND_DURATION_MS)}
              </span>
            </motion.div>

            <div className="glass-card px-4 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                Score preview
              </div>
              <AnimatedNumber
                value={game.scorePreview}
                className="font-display text-lg tracking-tight"
              />
            </div>

            <button
              aria-label="Restart"
              onClick={() => {
                SFX.click();
                game.reset();
              }}
              className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="glass-card gradient-border p-4 sm:p-6">
          <GameBoard
            rods={game.rods}
            discCount={game.discCount}
            selectedRod={game.selectedRod}
            invalidRod={game.invalidRod}
            invalidNonce={game.invalidNonce}
            disabled={game.phase === "won" || game.phase === "timeout"}
            onRodClick={game.handleRodClick}
            onDragMove={(from, to) => game.tryMove(from, to)}
          />

          {/* Hint */}
          <div className="mt-4">
            <HintArea
              moves={game.moves}
              minMoves={game.minMoves}
              solved={game.phase === "won"}
            />
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill label="Moves" value={`${game.moves}`} />
            <StatPill label="Minimum" value={`${game.minMoves}`} />
            <StatPill
              label="Efficiency"
              value={formatPercent(game.efficiency, 0)}
              tone={
                game.moves === 0
                  ? undefined
                  : game.efficiency >= 0.9
                    ? "good"
                    : game.efficiency >= 0.6
                      ? "ok"
                      : "warn"
              }
            />
            <StatPill label="Multiplier" value={`×${cfg.multiplier.toFixed(2)}`} />
          </div>
        </div>

        {/* Celebration overlay */}
        <AnimatePresence>
          {game.phase === "won" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="glass-strong gradient-border rounded-3xl px-8 py-6 text-center shadow-glow-gold"
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">
                  Solved
                </div>
                <div className="mt-1 font-display text-3xl gradient-text">
                  Tower complete
                </div>
                <div className="text-white/65 text-sm mt-1">
                  Tallying your score…
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "ok" | "warn";
}) {
  const palette =
    tone === "good"
      ? "border-emerald-300/25 bg-emerald-300/[0.05]"
      : tone === "warn"
        ? "border-rose-300/25 bg-rose-300/[0.05]"
        : tone === "ok"
          ? "border-amber-300/25 bg-amber-300/[0.05]"
          : "";
  return (
    <div className={`glass-card px-4 py-3 ${palette}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="font-display text-xl tracking-tight">{value}</div>
    </div>
  );
}
