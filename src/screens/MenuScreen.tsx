import { motion } from "framer-motion";
import { Play, Trophy, Calculator, Trash2, Volume2, VolumeX, Award } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { SFX } from "@/lib/audio";
import { formatNumber } from "@/lib/format";
import type { ScoreRecord } from "@/types";

interface Props {
  muted: boolean;
  onToggleMute: () => void;
  onStartNewPlayer: () => void;
  onLeaderboard: () => void;
  onScoring: () => void;
  onClearScores: () => void;
  scores: ScoreRecord[];
}

export function MenuScreen({
  muted,
  onToggleMute,
  onStartNewPlayer,
  onLeaderboard,
  onScoring,
  onClearScores,
  scores,
}: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const topScore = scores.reduce((m, s) => Math.max(m, s.score), 0);
  const totalRounds = scores.length;

  return (
    <PageShell>
      <div className="max-w-xl mx-auto">
        {/* Mute toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex justify-end mb-2"
        >
          <button
            onClick={() => {
              SFX.click();
              onToggleMute();
            }}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </motion.div>

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-5">
            <span
              className="grid place-items-center h-20 w-20 rounded-3xl shadow-glow"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(217,70,239,0.85) 100%)",
              }}
            >
              <Award className="h-10 w-10" />
            </span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-tight gradient-text">
            Hanoi Royale
          </h1>
          <p className="mt-3 text-white/50 text-sm max-w-xs mx-auto leading-relaxed">
            Move all discs to the right tower. The cleaner and faster you solve it, the more points you earn.
          </p>

          {totalRounds > 0 && (
            <div className="mt-6 inline-flex items-center gap-5 glass-card px-6 py-3 rounded-2xl">
              <div className="text-center">
                <div className="font-display text-2xl tracking-tight gradient-text">
                  {formatNumber(topScore)}
                </div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-white/40 mt-0.5">
                  Top score
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="font-display text-2xl tracking-tight">{totalRounds}</div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-white/40 mt-0.5">
                  Rounds played
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Primary */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              SFX.click();
              onStartNewPlayer();
            }}
            className="relative overflow-hidden w-full glass-card gradient-border p-5 sm:p-6 text-left"
          >
            <div
              aria-hidden
              className="absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-70 blur-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(217,70,239,0.6), transparent 70%)",
              }}
            />
            <div className="relative flex items-center gap-4">
              <span
                className="grid place-items-center h-12 w-12 rounded-xl flex-shrink-0 shadow-glow"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(217,70,239,0.9))",
                }}
              >
                <Play className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl sm:text-2xl tracking-tight">
                  Start New Player
                </div>
                <div className="text-white/50 text-sm mt-0.5">
                  Enter name, choose difficulty, begin
                </div>
              </div>
              <span className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-royale-violet/25 text-violet-200 border border-violet-300/25">
                Play
              </span>
            </div>
          </motion.button>

          {/* Secondary row */}
          <div className="grid grid-cols-2 gap-3">
            <TileButton
              delay={0.13}
              icon={<Trophy className="h-5 w-5 text-royale-gold" />}
              title="Leaderboard"
              description="Rankings & history"
              onClick={onLeaderboard}
            />
            <TileButton
              delay={0.17}
              icon={<Calculator className="h-5 w-5 text-violet-300" />}
              title="Scoring"
              description="How points work"
              onClick={onScoring}
            />
          </div>

          {/* Clear */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.35 }}
          >
            {confirmClear ? (
              <div className="glass-card p-4 flex items-center justify-between gap-3 rounded-2xl">
                <span className="text-sm text-rose-200">Clear all event scores?</span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-danger"
                    onClick={() => {
                      onClearScores();
                      setConfirmClear(false);
                    }}
                  >
                    Yes, clear
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                disabled={scores.length === 0}
                onClick={() => {
                  SFX.click();
                  setConfirmClear(true);
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-white/30 hover:text-white/55 disabled:opacity-20 disabled:cursor-not-allowed transition py-2.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Event Scores
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}

function TileButton({
  icon,
  title,
  description,
  onClick,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        SFX.click();
        onClick();
      }}
      className="glass-card p-4 sm:p-5 text-left hover:bg-white/[0.07] transition flex flex-col gap-3"
    >
      <span className="grid place-items-center h-10 w-10 rounded-lg bg-white/5 border border-white/10">
        {icon}
      </span>
      <div>
        <div className="font-display text-base tracking-tight">{title}</div>
        <div className="text-white/40 text-xs mt-0.5">{description}</div>
      </div>
    </motion.button>
  );
}
