import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Crown, Trash2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { DIFFICULTIES, DIFFICULTY_LIST } from "@/lib/difficulty";
import { formatDate, formatMs, formatNumber, formatPercent } from "@/lib/format";
import { SFX } from "@/lib/audio";
import type { Difficulty, ScoreRecord } from "@/types";

interface Props {
  scores: ScoreRecord[];
  latestScoreId: string | null;
  onBack: () => void;
  onClearAll: () => void;
}

type DifficultyFilter = "all" | Difficulty;
type SortKey = "score" | "date" | "efficiency" | "time";

export function LeaderboardScreen({
  scores,
  latestScoreId,
  onBack,
  onClearAll,
}: Props) {
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const filtered = useMemo(() => {
    let list = scores.slice();
    if (diffFilter !== "all") list = list.filter((s) => s.difficulty === diffFilter);
    switch (sortBy) {
      case "score":
        list.sort((a, b) => b.score - a.score);
        break;
      case "date":
        list.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "efficiency":
        list.sort((a, b) => b.efficiency - a.efficiency);
        break;
      case "time":
        list.sort((a, b) => a.timeUsedMs - b.timeUsedMs);
        break;
    }
    return list;
  }, [scores, diffFilter, sortBy]);

  // Top 3 all-time per difficulty filter
  const bests = useMemo(() => {
    const source =
      diffFilter === "all" ? scores : scores.filter((s) => s.difficulty === diffFilter);
    return [...source].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [scores, diffFilter]);

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            onClick={() => {
              SFX.click();
              onBack();
            }}
            className="btn-ghost"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="font-display text-2xl sm:text-3xl tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 text-royale-gold" />
            <span className="gradient-text">Leaderboard</span>
          </h1>
          {latestScoreId && (
            <span className="chip border-emerald-300/25 bg-emerald-300/10 text-emerald-200 text-xs">
              Your score saved
            </span>
          )}
          <div />
        </div>

        {/* Filters */}
        <div className="glass-card p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <FilterGroup label="Difficulty">
              <Chip active={diffFilter === "all"} onClick={() => setDiffFilter("all")}>
                All
              </Chip>
              {DIFFICULTY_LIST.map((d) => (
                <Chip
                  key={d.id}
                  active={diffFilter === d.id}
                  onClick={() => setDiffFilter(d.id)}
                >
                  {d.label}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Sort">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="input !py-2 max-w-[180px]"
              >
                <option value="score">Highest score</option>
                <option value="date">Most recent</option>
                <option value="efficiency">Best efficiency</option>
                <option value="time">Fastest time</option>
              </select>
            </FilterGroup>

            <div className="ml-auto">
              {confirmingClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-rose-200">Clear all local scores?</span>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      onClearAll();
                      setConfirmingClear(false);
                    }}
                  >
                    Yes, clear
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn-ghost"
                  onClick={() => setConfirmingClear(true)}
                  disabled={scores.length === 0}
                >
                  <Trash2 className="h-4 w-4" /> Clear local leaderboard
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {bests.map((b, i) => (
            <PodiumCard
              key={b.id}
              record={b}
              rank={i + 1}
              isLatest={b.id === latestScoreId}
            />
          ))}
          {bests.length === 0 && (
            <div className="glass-card p-6 text-white/55 lg:col-span-3 text-center">
              No scores yet. Play a round to seed the leaderboard.
            </div>
          )}
        </div>

        {/* History */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-display text-lg tracking-tight">History</div>
            <div className="text-xs text-white/45">
              {filtered.length} {filtered.length === 1 ? "record" : "records"}
            </div>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] sticky top-0 backdrop-blur-md">
                <tr className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Player</th>
                  <th className="text-left px-4 py-2">Difficulty</th>
                  <th className="text-right px-4 py-2">Score</th>
                  <th className="text-right px-4 py-2">Moves</th>
                  <th className="text-right px-4 py-2">Eff.</th>
                  <th className="text-right px-4 py-2">Time</th>
                  <th className="text-right px-4 py-2">Left</th>
                  <th className="text-right px-4 py-2">Result</th>
                  <th className="text-right px-4 py-2 pr-5">When</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((s, i) => {
                    const isLatest = s.id === latestScoreId;
                    return (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: Math.min(i, 12) * 0.015 }}
                        className={`border-t border-white/5 hover:bg-white/[0.03] ${
                          isLatest ? "bg-royale-violet/[0.1]" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 tabular-nums text-white/55">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            {isLatest && (
                              <span className="h-1.5 w-1.5 rounded-full bg-royale-mint" />
                            )}
                            <span className={isLatest ? "text-white" : "text-white/85"}>
                              {s.playerName}
                            </span>
                            {isLatest && (
                              <span className="text-[10px] uppercase tracking-widest text-royale-mint">
                                new
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <DifficultyChip d={s.difficulty} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-display tracking-tight">
                          {formatNumber(s.score)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-white/75">
                          {s.moves}/{s.minMoves}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-white/75">
                          {formatPercent(s.efficiency, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-white/75">
                          {formatMs(s.timeUsedMs)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-white/75">
                          {formatMs(s.timeLeftMs)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {s.solved ? (
                            <span className="text-emerald-300/90 text-xs font-medium">
                              Solved
                            </span>
                          ) : (
                            <span className="text-rose-300/90 text-xs font-medium">
                              Timeout
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-white/45 pr-5">
                          {formatDate(s.createdAt)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-white/45">
                      No records match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function PodiumCard({
  record,
  rank,
  isLatest,
}: {
  record: ScoreRecord;
  rank: number;
  isLatest: boolean;
}) {
  const accent =
    rank === 1
      ? "from-royale-gold/30 via-royale-amber/15"
      : rank === 2
        ? "from-white/15"
        : "from-orange-400/20";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`relative overflow-hidden glass-card gradient-border p-5 bg-gradient-to-br ${accent} to-transparent`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 chip">
          <Crown
            className={`h-3.5 w-3.5 ${
              rank === 1
                ? "text-royale-gold"
                : rank === 2
                  ? "text-white/80"
                  : "text-orange-300"
            }`}
          />
          #{rank}
        </span>
        <DifficultyChip d={record.difficulty} />
      </div>
      <div className="mt-3 font-display text-2xl tracking-tight">
        {record.playerName}
        {isLatest && (
          <span className="ml-2 text-[10px] uppercase tracking-widest text-royale-mint align-middle">
            new
          </span>
        )}
      </div>
      <div className="mt-1 font-display text-4xl gradient-text tracking-tight">
        {formatNumber(record.score)}
      </div>
      <div className="mt-2 text-xs text-white/55">
        {record.moves}/{record.minMoves} moves · {formatPercent(record.efficiency, 0)} eff ·{" "}
        {formatMs(record.timeUsedMs)}
      </div>
    </motion.div>
  );
}

function DifficultyChip({ d }: { d: Difficulty }) {
  const cfg = DIFFICULTIES[d];
  const tone =
    d === "easy"
      ? "bg-emerald-400/10 text-emerald-200 border-emerald-300/20"
      : d === "medium"
        ? "bg-violet-400/10 text-violet-200 border-violet-300/20"
        : "bg-rose-400/10 text-rose-200 border-rose-300/20";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${tone}`}
    >
      {cfg.label} · ×{cfg.multiplier.toFixed(2)}
    </span>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</span>
      <div className="flex items-center gap-1 flex-wrap">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        active
          ? "bg-white/15 border-white/20 text-white"
          : "bg-white/[0.03] border-white/10 text-white/65 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
