import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Props {
  moves: number;
  minMoves: number;
  solved: boolean;
}

/**
 * Soft, non-directive hints. Never reveals optimal moves.
 * Only warns about efficiency degradation as move count grows.
 */
export function HintArea({ moves, minMoves, solved }: Props) {
  const ratio = moves / Math.max(1, minMoves);
  let message = "";
  let tone: "info" | "warn" | "danger" = "info";

  if (solved) {
    message = "Clean solve. Nice work.";
    tone = "info";
  } else if (moves === 0) {
    message = "Make your first move when you’re ready — the timer starts then.";
    tone = "info";
  } else if (ratio <= 1) {
    message = "On pace. Keep it tight.";
    tone = "info";
  } else if (ratio <= 1.25) {
    message = "Careful — you’ve passed the optimal move count.";
    tone = "warn";
  } else if (ratio <= 1.75) {
    message = "Move count is getting high. Efficiency score is dropping.";
    tone = "warn";
  } else {
    message = "You can still recover, but your multiplier depends on cleaner moves.";
    tone = "danger";
  }

  const palette =
    tone === "info"
      ? "text-white/70 border-white/10 bg-white/[0.04]"
      : tone === "warn"
        ? "text-amber-100 border-amber-300/20 bg-amber-300/[0.06]"
        : "text-rose-100 border-rose-400/25 bg-rose-400/[0.06]";

  return (
    <div className="min-h-[44px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm border ${palette}`}
        >
          <Sparkles className="h-3.5 w-3.5 opacity-70" />
          <span>{message}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
