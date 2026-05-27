import { motion } from "framer-motion";
import { ArrowLeft, Play, ChevronRight, Info } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { DIFFICULTY_LIST } from "@/lib/difficulty";
import { SFX } from "@/lib/audio";
import type { Difficulty } from "@/types";

interface Props {
  onStart: (name: string, difficulty: Difficulty) => void;
  onBack: () => void;
}

export function NewPlayerScreen({ onStart, onBack }: Props) {
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const trimmed = name.trim().slice(0, 24);
  const canStart = trimmed.length >= 2;

  const handleStart = () => {
    if (!canStart) return;
    SFX.click();
    onStart(trimmed, difficulty);
  };

  return (
    <PageShell>
      <div className="max-w-xl mx-auto">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-7"
        >
          <button
            onClick={() => {
              SFX.click();
              onBack();
            }}
            className="btn-ghost"
          >
            <ArrowLeft className="h-4 w-4" /> Back to menu
          </button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-7"
        >
          <span className="chip">New Player</span>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight">
            Your <span className="gradient-text">turn</span>
          </h1>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <Info className="h-4 w-4 text-white/50 mt-0.5 flex-shrink-0" />
            <p className="text-white/60 text-sm leading-relaxed">
              Each player gets <strong className="text-white/85">one 5-minute attempt</strong>.
              Solve the tower as fast and cleanly as possible for the highest score.
            </p>
          </div>
        </motion.div>

        {/* Name input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="glass-card p-5 sm:p-6 mb-5"
        >
          <label
            htmlFor="player-name"
            className="block text-[11px] uppercase tracking-[0.18em] text-white/50 mb-3"
          >
            Display name
          </label>
          <input
            id="player-name"
            autoFocus
            type="text"
            className="input w-full text-xl py-3.5"
            placeholder="Enter your name…"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
          />
          {name.length > 0 && trimmed.length < 2 && (
            <p className="mt-2 text-[12px] text-rose-300/70">At least 2 characters required.</p>
          )}
        </motion.div>

        {/* Difficulty */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4 }}
          className="mb-6"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-3">
            Difficulty
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {DIFFICULTY_LIST.map((d) => {
              const active = difficulty === d.id;
              const accent =
                d.id === "easy"
                  ? "border-emerald-400/40 bg-emerald-400/[0.08]"
                  : d.id === "medium"
                    ? "border-violet-400/40 bg-violet-400/[0.08]"
                    : "border-rose-400/40 bg-rose-400/[0.08]";
              const accentText =
                d.id === "easy"
                  ? "text-emerald-300"
                  : d.id === "medium"
                    ? "text-violet-300"
                    : "text-rose-300";
              return (
                <motion.button
                  key={d.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    SFX.click();
                    setDifficulty(d.id);
                  }}
                  className={`relative overflow-hidden rounded-2xl border p-3.5 text-left transition ${
                    active
                      ? `${accent} shadow-glow`
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          d.id === "easy"
                            ? "radial-gradient(circle at 50% 0%, rgba(52,211,153,0.15), transparent 70%)"
                            : d.id === "medium"
                              ? "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.18), transparent 70%)"
                              : "radial-gradient(circle at 50% 0%, rgba(251,113,133,0.18), transparent 70%)",
                      }}
                    />
                  )}
                  <div className="relative">
                    <div
                      className={`font-display text-base sm:text-lg tracking-tight ${
                        active ? accentText : "text-white/75"
                      }`}
                    >
                      {d.label}
                    </div>
                    <div className="text-[11px] text-white/45 mt-0.5">{d.discs} discs</div>
                    <div className={`mt-2 text-xs font-semibold ${active ? accentText : "text-white/40"}`}>
                      ×{d.multiplier.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-white/35 mt-0.5 leading-tight">{d.tagline}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Start button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <motion.button
            whileHover={canStart ? { scale: 1.015 } : undefined}
            whileTap={canStart ? { scale: 0.985 } : undefined}
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full btn-primary text-base py-4 flex items-center justify-center gap-2 ${
              !canStart ? "opacity-35 cursor-not-allowed" : ""
            }`}
          >
            <Play className="h-5 w-5" />
            Start Round
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </div>
    </PageShell>
  );
}
