import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Pencil, Plus, Trash2, UserCircle2, X } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { SFX } from "@/lib/audio";
import { formatDate, formatNumber } from "@/lib/format";
import type { PlayerProfile, ScoreRecord } from "@/types";

interface Props {
  players: PlayerProfile[];
  activePlayerId: string | null;
  scores: ScoreRecord[];
  onBack: () => void;
  onCreate: (name: string) => void;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function ProfilesScreen({
  players,
  activePlayerId,
  scores,
  onBack,
  onCreate,
  onSelect,
  onRename,
  onDelete,
}: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const submitCreate = () => {
    const t = newName.trim();
    if (t.length < 2) return;
    SFX.click();
    onCreate(t);
    setNewName("");
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto">
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
          className="mb-6"
        >
          <h1 className="font-display text-3xl tracking-tight">
            <span className="gradient-text">Profiles</span>
          </h1>
          <p className="mt-1 text-white/55">
            Switch between players or add a new one. Each profile keeps its own score
            history.
          </p>
        </motion.div>

        <div className="glass-card p-4 sm:p-5 mb-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mb-2">
            Add a player
          </div>
          <div className="flex gap-2">
            <input
              value={newName}
              maxLength={24}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCreate()}
              placeholder="Display name"
              className="input"
            />
            <button onClick={submitCreate} className="btn-primary whitespace-nowrap">
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {players.map((p) => {
              const isActive = p.id === activePlayerId;
              const playerScores = scores.filter((s) => s.playerId === p.id);
              const best = playerScores.reduce((m, s) => Math.max(m, s.score), 0);
              const isEditing = editingId === p.id;
              const isConfirming = confirmDeleteId === p.id;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`glass-card p-4 sm:p-5 ${
                    isActive ? "border-royale-mint/30 bg-royale-mint/[0.05]" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <UserCircle2 className="h-9 w-9 text-white/70" />
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            value={editName}
                            maxLength={24}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onRename(p.id, editName);
                                setEditingId(null);
                              } else if (e.key === "Escape") setEditingId(null);
                            }}
                            className="input !py-2"
                          />
                          <button
                            className="btn-ghost"
                            onClick={() => {
                              onRename(p.id, editName);
                              setEditingId(null);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            className="btn-ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-display text-lg tracking-tight flex items-center gap-2">
                            {p.name}
                            {isActive && (
                              <span className="text-[10px] uppercase tracking-widest text-royale-mint">
                                active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/45 mt-0.5">
                            Best {formatNumber(best)} · {playerScores.length} rounds · joined{" "}
                            {formatDate(p.createdAt)}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isActive && !isEditing && (
                        <button
                          className="btn-ghost"
                          onClick={() => {
                            SFX.click();
                            onSelect(p.id);
                          }}
                        >
                          Switch to
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          aria-label="Rename"
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                          onClick={() => {
                            setEditingId(p.id);
                            setEditName(p.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {isConfirming ? (
                        <>
                          <button
                            className="btn-danger"
                            onClick={() => {
                              onDelete(p.id);
                              setConfirmDeleteId(null);
                            }}
                          >
                            Delete
                          </button>
                          <button
                            className="btn-ghost"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          aria-label="Delete"
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/20 text-rose-200"
                          onClick={() => setConfirmDeleteId(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {players.length === 0 && (
            <div className="glass-card p-6 text-center text-white/55">
              No profiles yet. Create one above.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
