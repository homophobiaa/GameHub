import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { SFX } from "@/lib/audio";

interface Props {
  onCreate: (name: string) => void;
}

export function OnboardingScreen({ onCreate }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Pick a display name of at least 2 characters.");
      return;
    }
    SFX.click();
    onCreate(trimmed);
  };

  return (
    <PageShell className="flex items-center justify-center">
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-8"
        >
          <span className="chip mb-5">
            <Sparkles className="h-3.5 w-3.5" />
            New player
          </span>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-balance">
            Welcome to <span className="gradient-text">Hanoi Royale</span>
          </h1>
          <p className="mt-4 text-white/60 text-balance">
            A competitive Tower of Hanoi score game. Choose a display name to begin —
            your scores will be saved locally and tracked on the leaderboard.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card gradient-border p-6 sm:p-8"
        >
          <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="name">
            Display name
          </label>
          <div className="flex gap-2">
            <input
              id="name"
              autoFocus
              maxLength={24}
              value={name}
              onChange={(e) => {
                setError(null);
                setName(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="e.g. Phoenix"
              className="input"
            />
            <button onClick={submit} className="btn-primary whitespace-nowrap">
              Enter <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-rose-300">{error}</p>
          ) : (
            <p className="mt-2 text-sm text-white/40">
              Stored locally in your browser. You can switch profiles anytime.
            </p>
          )}

          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/60">
            <li className="glass rounded-xl p-3">
              <div className="font-medium text-white/85">5:00 rounds</div>
              <div>Hard timer, no exceptions.</div>
            </li>
            <li className="glass rounded-xl p-3">
              <div className="font-medium text-white/85">Transparent scoring</div>
              <div>Every point is explained.</div>
            </li>
            <li className="glass rounded-xl p-3">
              <div className="font-medium text-white/85">Local leaderboard</div>
              <div>Persistent across sessions.</div>
            </li>
          </ul>
        </motion.div>
      </div>
    </PageShell>
  );
}
