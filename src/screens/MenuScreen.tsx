import { motion } from "framer-motion";
import { Play, Trophy, Calculator, Users, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { SFX } from "@/lib/audio";
import type { PlayerProfile, ScoreRecord, ScreenId } from "@/types";
import { DIFFICULTY_LIST } from "@/lib/difficulty";
import { formatNumber } from "@/lib/format";

interface Props {
  player: PlayerProfile;
  scores: ScoreRecord[];
  onNavigate: (s: ScreenId) => void;
}

export function MenuScreen({ player, scores, onNavigate }: Props) {
  const playerScores = scores.filter((s) => s.playerId === player.id);
  const playerBest = playerScores.reduce((m, s) => Math.max(m, s.score), 0);
  const playerRounds = playerScores.length;
  const globalBest = scores.reduce((m, s) => Math.max(m, s.score), 0);

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
        >
          <div>
            <span className="chip">Welcome back</span>
            <h1 className="mt-3 font-display text-3xl sm:text-5xl tracking-tight">
              Hello, <span className="gradient-text">{player.name}</span>
            </h1>
            <p className="mt-2 text-white/55 max-w-xl">
              Move every disc to the rightmost rod within five minutes. Cleaner solves
              and faster times mean more points. Hard mode pays the most.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Stat label="Your best" value={formatNumber(playerBest)} />
            <Stat label="Rounds" value={formatNumber(playerRounds)} />
            <Stat label="Top score" value={formatNumber(globalBest)} />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            whileHover={{ y: -3 }}
            onClick={() => {
              SFX.click();
              onNavigate("difficulty");
            }}
            className="relative overflow-hidden glass-card gradient-border p-6 text-left lg:col-span-2"
          >
            <div
              aria-hidden
              className="absolute -top-20 -right-20 h-60 w-60 rounded-full opacity-60 blur-3xl"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(217,70,239,0.55), rgba(217,70,239,0) 70%)",
              }}
            />
            <div className="relative flex items-start gap-4">
              <span className="grid place-items-center h-12 w-12 rounded-xl bg-gradient-to-br from-royale-violet to-royale-fuchsia shadow-glow">
                <Play className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-display text-2xl tracking-tight">Play a round</div>
                <div className="text-white/55 text-sm mt-1">
                  Pick a difficulty. The timer starts on your first move.
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {DIFFICULTY_LIST.map((d) => (
                    <span key={d.id} className="chip">
                      {d.label} · {d.multiplier.toFixed(2)}×
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-white/40" />
            </div>
          </motion.button>

          <TileButton
            delay={0.1}
            title="Leaderboard"
            description="Best scores per player and full history."
            icon={<Trophy className="h-5 w-5" />}
            onClick={() => onNavigate("leaderboard")}
          />
          <TileButton
            delay={0.15}
            title="Scoring formula"
            description="See exactly how every point is awarded."
            icon={<Calculator className="h-5 w-5" />}
            onClick={() => onNavigate("scoring")}
          />
          <TileButton
            delay={0.2}
            title="Profiles"
            description="Switch player or create another."
            icon={<Users className="h-5 w-5" />}
            onClick={() => onNavigate("profiles")}
          />
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card px-4 py-3 text-center min-w-[88px]">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="font-display text-xl tracking-tight">{value}</div>
    </div>
  );
}

function TileButton({
  title,
  description,
  icon,
  onClick,
  delay = 0,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3 }}
      onClick={() => {
        SFX.click();
        onClick();
      }}
      className="glass-card p-5 text-left flex items-start gap-3 hover:bg-white/[0.07] transition"
    >
      <span className="grid place-items-center h-10 w-10 rounded-lg bg-white/5 border border-white/10 text-white/85">
        {icon}
      </span>
      <div className="flex-1">
        <div className="font-display text-lg tracking-tight">{title}</div>
        <div className="text-white/55 text-sm mt-0.5">{description}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-white/40" />
    </motion.button>
  );
}
