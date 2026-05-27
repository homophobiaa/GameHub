import { motion } from "framer-motion";
import { Home, RefreshCw, Trophy, Users, Calculator, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { computeScore } from "@/lib/scoring";
import { DIFFICULTIES } from "@/lib/difficulty";
import { formatMs, formatNumber, formatPercent } from "@/lib/format";
import { SFX } from "@/lib/audio";
import type { GameResult } from "@/screens/GameScreen";

interface Props {
  result: GameResult;
  playerName: string;
  onNextPlayer: () => void;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
  onScoring: () => void;
  onMenu: () => void;
}

export function ResultScreen({
  result,
  playerName,
  onNextPlayer,
  onPlayAgain,
  onLeaderboard,
  onScoring,
  onMenu,
}: Props) {
  const cfg = DIFFICULTIES[result.difficulty];
  const breakdown = computeScore({
    difficulty: result.difficulty,
    discs: result.discs,
    moves: result.moves,
    remainingSeconds: Math.floor(result.remainingMs / 1000),
    solved: result.solved,
    progressPercent: result.progressPercent,
  });

  const reasonLabel =
    result.reason === "solved"
      ? "Solved"
      : result.reason === "quit"
        ? "Quit"
        : "Time's Up";

  const headline =
    result.reason === "solved"
      ? "Tower Complete!"
      : result.reason === "quit"
        ? "Round Ended"
        : "Time's Up";

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            {result.solved ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-300" />
            )}
            <span
              className={`chip ${
                result.solved
                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                  : "border-rose-300/25 bg-rose-300/10 text-rose-200"
              }`}
            >
              {reasonLabel}
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
            {result.solved ? (
              <span className="gradient-text">{headline}</span>
            ) : (
              <span className="text-white/90">{headline}</span>
            )}
          </h1>

          <p className="mt-2 text-white/50 text-sm">
            <span className="text-white/75 font-medium">{playerName}</span>
            {" · "}
            {cfg.label} · {cfg.discs} discs
          </p>
        </motion.div>

        {/* Score hero */}
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="relative glass-card gradient-border p-7 sm:p-8 text-center overflow-hidden mb-5"
        >
          <div
            aria-hidden
            className="absolute -top-28 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full blur-3xl opacity-55 pointer-events-none"
            style={{
              background: result.solved
                ? "radial-gradient(closest-side, rgba(245,196,81,0.4), rgba(217,70,239,0.2), transparent 70%)"
                : "radial-gradient(closest-side, rgba(139,92,246,0.3), transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">
              Final Score
            </div>
            <div className="mt-1 font-display text-6xl sm:text-7xl tracking-tight">
              <AnimatedNumber value={breakdown.finalScore} duration={1.3} />
            </div>
            <div className="mt-2 text-white/45 text-sm">
              {cfg.label} · ×{cfg.multiplier.toFixed(2)} difficulty multiplier
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13, duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5"
        >
          <KV k="Moves" v={`${result.moves}`} />
          <KV k="Min moves" v={`${result.minMoves}`} />
          <KV k="Efficiency" v={formatPercent(result.efficiency, 0)} />
          <KV
            k="Time used"
            v={result.elapsedMs > 0 ? formatMs(result.elapsedMs) : "—"}
            icon={<Clock className="h-3 w-3 text-white/30" />}
          />
        </motion.div>

        {/* Score breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="glass-card p-4 sm:p-5 mb-5"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">
            Score Breakdown
          </div>
          <div className="space-y-2.5 text-sm">
            {result.solved ? (
              <>
                <BLine
                  label="Move efficiency"
                  sub={`${result.moves} moves / ${result.minMoves} min = ${formatPercent(breakdown.moveEfficiency, 0)}`}
                  value={Math.round(breakdown.efficiencyPoints)}
                />
                <BLine
                  label="Time bonus"
                  sub={`${formatMs(result.remainingMs)} remaining`}
                  value={Math.round(breakdown.timeBonus)}
                />
                <BLine
                  label="Completion bonus"
                  sub="puzzle solved"
                  value={Math.round(breakdown.completionBonus)}
                />
                <div className="h-px bg-white/10" />
                <BLine
                  label={`Difficulty multiplier ×${cfg.multiplier.toFixed(2)}`}
                  sub="harder difficulty → more points"
                  value={breakdown.finalScore}
                  highlight
                />
              </>
            ) : (
              <>
                <BLine
                  label="Partial credit"
                  sub={`${formatPercent(result.progressPercent, 0)} of discs moved toward target`}
                  value={Math.round(breakdown.preMultiplier)}
                />
                <div className="h-px bg-white/10" />
                <BLine
                  label={`Difficulty multiplier ×${cfg.multiplier.toFixed(2)}`}
                  sub="harder difficulty → more points"
                  value={breakdown.finalScore}
                  highlight
                />
              </>
            )}
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.4 }}
          className="space-y-2.5"
        >
          {/* Primary: Next Player */}
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className="w-full btn-primary text-base py-4 flex items-center justify-center gap-2"
            onClick={() => {
              SFX.click();
              onNextPlayer();
            }}
          >
            <Users className="h-5 w-5" />
            Next Player
          </motion.button>

          {/* Secondary row */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              className="btn-ghost flex items-center justify-center gap-2"
              onClick={() => {
                SFX.click();
                onPlayAgain();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Play Again
            </button>
            <button
              className="btn-ghost flex items-center justify-center gap-2"
              onClick={() => {
                SFX.click();
                onLeaderboard();
              }}
            >
              <Trophy className="h-4 w-4" />
              Leaderboard
            </button>
          </div>

          {/* Tertiary row */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              className="btn-ghost flex items-center justify-center gap-2 text-white/50 hover:text-white/80"
              onClick={() => {
                SFX.click();
                onScoring();
              }}
            >
              <Calculator className="h-4 w-4" />
              Scoring Formula
            </button>
            <button
              className="btn-ghost flex items-center justify-center gap-2 text-white/50 hover:text-white/80"
              onClick={() => {
                SFX.click();
                onMenu();
              }}
            >
              <Home className="h-4 w-4" />
              Main Menu
            </button>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}

function KV({ k, v, icon }: { k: string; v: string; icon?: React.ReactNode }) {
  return (
    <div className="glass-card px-3 py-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1">
        {icon}
        {k}
      </div>
      <div className="font-display text-xl tracking-tight">{v}</div>
    </div>
  );
}

function BLine({
  label,
  sub,
  value,
  highlight,
}: {
  label: string;
  sub: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className={highlight ? "text-white font-medium" : "text-white/80"}>{label}</div>
        <div className="text-[11px] text-white/35 mt-0.5">{sub}</div>
      </div>
      <div
        className={`tabular-nums font-mono flex-shrink-0 ${
          highlight ? "gradient-text text-lg font-bold" : "text-white/75"
        }`}
      >
        {formatNumber(value)}
      </div>
    </div>
  );
}
