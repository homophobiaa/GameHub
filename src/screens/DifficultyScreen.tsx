import { motion } from "framer-motion";
import { ArrowLeft, Play } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { DIFFICULTY_LIST, minMovesForDiscs } from "@/lib/difficulty";
import { SFX } from "@/lib/audio";
import type { Difficulty, DifficultyConfig } from "@/types";

interface Props {
  onPick: (d: Difficulty) => void;
  onBack: () => void;
}

const ACCENTS: Record<Difficulty, { from: string; to: string; ring: string }> = {
  easy: { from: "#34d399", to: "#22d3ee", ring: "rgba(52,211,153,0.45)" },
  medium: { from: "#a78bfa", to: "#d946ef", ring: "rgba(167,139,250,0.55)" },
  hard: { from: "#fb7185", to: "#f5c451", ring: "rgba(251,113,133,0.55)" },
};

export function DifficultyScreen({ onPick, onBack }: Props) {
  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => {
            SFX.click();
            onBack();
          }}
          className="btn-ghost mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
            Choose your <span className="gradient-text">difficulty</span>
          </h1>
          <p className="mt-2 text-white/55 max-w-2xl">
            Higher difficulty means more discs, more required moves, and a much higher
            score ceiling. Pick wisely — the timer is the same 5:00 either way.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {DIFFICULTY_LIST.map((d, i) => (
            <DifficultyCard key={d.id} cfg={d} delay={i * 0.06} onPick={onPick} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function DifficultyCard({
  cfg,
  onPick,
  delay,
}: {
  cfg: DifficultyConfig;
  onPick: (d: Difficulty) => void;
  delay: number;
}) {
  const accent = ACCENTS[cfg.id];
  const minMoves = minMovesForDiscs(cfg.discs);

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      onClick={() => {
        SFX.click();
        onPick(cfg.id);
      }}
      className="relative overflow-hidden glass-card gradient-border p-6 text-left flex flex-col"
    >
      <div
        aria-hidden
        className="absolute -top-24 -right-16 h-72 w-72 rounded-full opacity-50 blur-3xl"
        style={{
          background: `radial-gradient(closest-side, ${accent.ring}, transparent 70%)`,
        }}
      />

      <div className="relative flex items-center justify-between">
        <div
          className="font-display text-2xl tracking-tight"
          style={{
            background: `linear-gradient(120deg, ${accent.from}, ${accent.to})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {cfg.label}
        </div>
        <span className="chip">{cfg.discs} discs</span>
      </div>

      <p className="relative mt-3 text-white/70 text-sm">{cfg.tagline}.</p>
      <p className="relative mt-1 text-white/45 text-sm">{cfg.description}</p>

      <dl className="relative mt-5 grid grid-cols-3 gap-2 text-center">
        <KV k="Base" v={cfg.baseScore.toLocaleString()} />
        <KV k="Multiplier" v={`${cfg.multiplier.toFixed(2)}×`} />
        <KV k="Min moves" v={`${minMoves}`} />
      </dl>

      <div className="relative mt-5 flex items-center gap-2">
        <span className="btn-primary w-full justify-center">
          <Play className="h-4 w-4" /> Start
        </span>
      </div>

      <div className="relative mt-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
        {cfg.id === "easy" && "Lowest risk · lowest score potential"}
        {cfg.id === "medium" && "Balanced risk · solid score potential"}
        {cfg.id === "hard" && "Highest risk · highest score potential"}
      </div>
    </motion.button>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="glass rounded-lg px-2 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">{k}</div>
      <div className="font-display text-base tracking-tight">{v}</div>
    </div>
  );
}
