import { motion } from "framer-motion";
import { ArrowLeft, Calculator } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { DIFFICULTY_LIST, ROUND_DURATION_S, minMovesForDiscs } from "@/lib/difficulty";
import { computeScore } from "@/lib/scoring";
import { formatNumber } from "@/lib/format";
import { SFX } from "@/lib/audio";

interface Props {
  onBack: () => void;
}

export function ScoringScreen({ onBack }: Props) {
  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <span className="chip">
            <Calculator className="h-3.5 w-3.5" />
            Transparent scoring
          </span>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl tracking-tight">
            How <span className="gradient-text">Hanoi Royale</span> scores you
          </h1>
          <p className="mt-2 text-white/55 max-w-3xl">
            Every point is determined by a deterministic formula. Cleaner solves and faster
            completion produce higher scores. Hard mode pays the most because its
            multiplier is the largest and its base score is the highest.
          </p>
        </motion.div>

        {/* Formula cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <FormulaCard
            title="Minimum moves"
            formula="minimumMoves = 2^discCount − 1"
            description="The provably optimal solve length for the puzzle."
            example={`Easy (3): ${minMovesForDiscs(3)} · Medium (4): ${minMovesForDiscs(
              4
            )} · Hard (5): ${minMovesForDiscs(5)}`}
          />
          <FormulaCard
            title="Move efficiency"
            formula="moveEfficiency = clamp(minimumMoves / actualMoves, 0, 1)"
            description="A perfect solve = 100%. Every extra move drags the score down."
            example="At minimum moves: 1.00 · 1.25× moves: 0.80 · 2× moves: 0.50"
          />
          <FormulaCard
            title="Time bonus"
            formula="timeBonus = baseScore × 0.4 × (remainingSeconds / 300)"
            description={`Rounds are 5 minutes (${ROUND_DURATION_S}s). The faster you finish, the larger your bonus, up to +40% of base.`}
            example="Solve with 4:00 left on Medium: 2200 × 0.4 × 0.80 = 704 pts"
          />
          <FormulaCard
            title="Completion bonus"
            formula="completionBonus = baseScore × 0.25  (solved only)"
            description="A flat reward for solving — added before the multiplier."
            example="On Hard: 4000 × 0.25 = 1000 pts → ×2.50 = 2,500 final pts"
          />
          <FormulaCard
            title="Difficulty multiplier"
            formula="finalScore = round(subtotal × difficultyMultiplier)"
            description="Why Hard mode can score more. The multiplier ladders up steeply."
            example="Easy ×1.00 · Medium ×1.65 · Hard ×2.50"
          />
          <FormulaCard
            title="Partial credit (timeout)"
            formula="finalScore = round(baseScore × 0.15 × progress × multiplier)"
            description="If time runs out, you keep credit for discs correctly stacked at the target rod from the bottom up. Solving is always far more valuable."
            example="Hard at 60% progress: 4000 × 0.15 × 0.6 × 2.5 = 900 pts"
          />
        </div>

        {/* Worked examples */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="mt-8 glass-card p-5 sm:p-6"
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 mb-3">
            Worked examples — perfect solves with 4:00 left
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DIFFICULTY_LIST.map((d) => {
              const breakdown = computeScore({
                difficulty: d.id,
                discs: d.discs,
                moves: minMovesForDiscs(d.discs),
                remainingSeconds: 240,
                solved: true,
                progressPercent: 1,
              });
              return (
                <div key={d.id} className="glass rounded-xl p-4">
                  <div className="text-white/85 font-display text-lg">{d.label}</div>
                  <div className="text-xs text-white/45 mb-2">
                    base {formatNumber(d.baseScore)} · ×{d.multiplier.toFixed(2)}
                  </div>
                  <div className="font-mono text-xs text-white/65 space-y-0.5">
                    <div>eff: {formatNumber(Math.round(breakdown.efficiencyPoints))}</div>
                    <div>time: {formatNumber(Math.round(breakdown.timeBonus))}</div>
                    <div>complete: {formatNumber(Math.round(breakdown.completionBonus))}</div>
                  </div>
                  <div className="mt-2 font-display text-2xl gradient-text tracking-tight">
                    {formatNumber(breakdown.finalScore)}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-white/55">
            <span className="text-white/85 font-medium">Why Hard pays more:</span> a perfect
            Hard solve under pressure earns roughly{" "}
            <span className="text-white/85">
              {Math.round(
                computeScore({
                  difficulty: "hard",
                  discs: 5,
                  moves: minMovesForDiscs(5),
                  remainingSeconds: 240,
                  solved: true,
                  progressPercent: 1,
                }).finalScore /
                  computeScore({
                    difficulty: "easy",
                    discs: 3,
                    moves: minMovesForDiscs(3),
                    remainingSeconds: 240,
                    solved: true,
                    progressPercent: 1,
                  }).finalScore *
                  100
              ) / 100}
              ×
            </span>{" "}
            an equally clean Easy solve — courtesy of its larger base score and 2.50×
            multiplier.
          </p>
        </motion.div>

        <p className="mt-6 text-xs text-white/40 max-w-2xl">
          Hanoi Royale never shows optimal move sequences or step-by-step hints. Skill is
          rewarded purely through cleaner play and faster completion.
        </p>
      </div>
    </PageShell>
  );
}

function FormulaCard({
  title,
  formula,
  description,
  example,
}: {
  title: string;
  formula: string;
  description: string;
  example: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-5"
    >
      <div className="font-display text-lg tracking-tight">{title}</div>
      <pre className="mt-2 font-mono text-xs text-white/80 bg-black/30 rounded-lg p-3 overflow-x-auto border border-white/5">
        {formula}
      </pre>
      <p className="mt-3 text-sm text-white/65">{description}</p>
      <div className="mt-2 text-xs text-white/45">e.g. {example}</div>
    </motion.div>
  );
}
