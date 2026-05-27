import { motion } from "framer-motion";
import { Home, RefreshCw, Trophy } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { computeScore } from "@/lib/scoring";
import { DIFFICULTIES, ROUND_DURATION_MS } from "@/lib/difficulty";
import { formatMs, formatNumber, formatPercent } from "@/lib/format";
import { SFX } from "@/lib/audio";
import type { GameResult } from "@/screens/GameScreen";

interface Props {
  result: GameResult;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
  onMenu: () => void;
  onLeaderboard: () => void;
}

export function ResultScreen({
  result,
  onPlayAgain,
  onChangeDifficulty,
  onMenu,
  onLeaderboard,
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

  const headline = result.solved ? "Tower complete" : "Time's up";
  const subline = result.solved
    ? `${cfg.label} solved in ${formatMs(result.elapsedMs)} with ${result.moves} moves`
    : `${cfg.label} ended with ${result.moves} moves at ${formatPercent(
        result.progressPercent,
        0
      )} progress`;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center mb-8"
        >
          <span className="chip">
            <Trophy className="h-3.5 w-3.5" />
            Round summary
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl tracking-tight">
            {result.solved ? (
              <span className="gradient-text">{headline}</span>
            ) : (
              headline
            )}
          </h1>
          <p className="mt-2 text-white/55">{subline}</p>
        </motion.div>

        {/* Final score hero */}
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative glass-card gradient-border p-8 text-center overflow-hidden mb-6"
        >
          <div
            aria-hidden
            className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full blur-3xl opacity-60"
            style={{
              background:
                "radial-gradient(closest-side, rgba(245,196,81,0.45), rgba(217,70,239,0.25), transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/55">
              Final score
            </div>
            <div className="mt-1 font-display text-6xl sm:text-7xl tracking-tight">
              <AnimatedNumber value={breakdown.finalScore} duration={1.2} />
            </div>
            <div className="mt-2 text-white/55 text-sm">
              {cfg.label} · ×{cfg.multiplier.toFixed(2)} multiplier
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <KV k="Moves" v={`${result.moves}`} />
          <KV k="Min moves" v={`${result.minMoves}`} />
          <KV k="Efficiency" v={formatPercent(result.efficiency, 0)} />
          <KV k="Time left" v={formatMs(result.remainingMs)} />
        </motion.div>

        {/* Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="glass-card p-5 sm:p-6 mb-6"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mb-3">
            Score breakdown
          </div>
          <div className="space-y-2 font-mono text-sm">
            {result.solved ? (
              <>
                <Line
                  label="Efficiency points"
                  detail={`baseScore × moveEfficiency = ${formatNumber(
                    breakdown.baseScore
                  )} × ${breakdown.moveEfficiency.toFixed(3)}`}
                  value={Math.round(breakdown.efficiencyPoints)}
                />
                <Line
                  label="Time bonus"
                  detail={`baseScore × 0.4 × (remaining/300) = ${formatNumber(
                    breakdown.baseScore
                  )} × 0.4 × ${(result.remainingMs / ROUND_DURATION_MS).toFixed(3)}`}
                  value={Math.round(breakdown.timeBonus)}
                />
                <Line
                  label="Completion bonus"
                  detail={`baseScore × 0.25`}
                  value={Math.round(breakdown.completionBonus)}
                />
                <Divider />
                <Line
                  label="Pre-multiplier subtotal"
                  detail="efficiencyPoints + timeBonus + completionBonus"
                  value={Math.round(breakdown.preMultiplier)}
                  bold
                />
                <Line
                  label={`Difficulty multiplier (×${breakdown.difficultyMultiplier.toFixed(
                    2
                  )})`}
                  detail="subtotal × multiplier"
                  value={breakdown.finalScore}
                  bold
                  highlight
                />
              </>
            ) : (
              <>
                <Line
                  label="Partial credit"
                  detail={`baseScore × 0.15 × progress = ${formatNumber(
                    breakdown.baseScore
                  )} × 0.15 × ${breakdown.progressPercent.toFixed(3)}`}
                  value={Math.round(breakdown.preMultiplier)}
                />
                <Divider />
                <Line
                  label={`Difficulty multiplier (×${breakdown.difficultyMultiplier.toFixed(
                    2
                  )})`}
                  detail="partial × multiplier"
                  value={breakdown.finalScore}
                  bold
                  highlight
                />
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="flex flex-wrap gap-2 sm:gap-3 justify-center"
        >
          <button
            className="btn-primary"
            onClick={() => {
              SFX.click();
              onPlayAgain();
            }}
          >
            <RefreshCw className="h-4 w-4" /> Play again
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              SFX.click();
              onChangeDifficulty();
            }}
          >
            Change difficulty
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              SFX.click();
              onLeaderboard();
            }}
          >
            <Trophy className="h-4 w-4" /> Leaderboard
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              SFX.click();
              onMenu();
            }}
          >
            <Home className="h-4 w-4" /> Menu
          </button>
        </motion.div>
      </div>
    </PageShell>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="glass-card px-4 py-3 text-center">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{k}</div>
      <div className="font-display text-xl tracking-tight">{v}</div>
    </div>
  );
}

function Line({
  label,
  detail,
  value,
  bold,
  highlight,
}: {
  label: string;
  detail: string;
  value: number;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className={bold ? "text-white" : "text-white/80"}>
        <div className={bold ? "font-semibold" : ""}>{label}</div>
        <div className="text-[11px] text-white/40 font-normal">{detail}</div>
      </div>
      <div
        className={`tabular-nums ${bold ? "font-bold" : ""} ${
          highlight ? "gradient-text text-lg" : "text-white/85"
        }`}
      >
        {formatNumber(value)}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/10 my-1" />;
}
