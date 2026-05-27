import { motion, type PanInfo } from "framer-motion";
import { forwardRef } from "react";

export const DISC_BASE_WIDTH = 56;
export const DISC_STEP = 26;
export const DISC_HEIGHT = 28;

export function discWidth(size: number): number {
  return DISC_BASE_WIDTH + DISC_STEP * (size - 1);
}

const PALETTES: Record<number, { from: string; via: string; to: string; glow: string }> = {
  1: { from: "#a78bfa", via: "#c4b5fd", to: "#7c3aed", glow: "rgba(167,139,250,0.55)" },
  2: { from: "#f0abfc", via: "#e879f9", to: "#a21caf", glow: "rgba(232,121,249,0.5)" },
  3: { from: "#fda4af", via: "#fb7185", to: "#be123c", glow: "rgba(251,113,133,0.5)" },
  4: { from: "#fde68a", via: "#fbbf24", to: "#b45309", glow: "rgba(251,191,36,0.5)" },
  5: { from: "#67e8f9", via: "#22d3ee", to: "#0e7490", glow: "rgba(34,211,238,0.5)" },
};

export function discPalette(size: number) {
  return PALETTES[size] ?? PALETTES[1];
}

interface DiscProps {
  size: number;
  isTop: boolean;
  isSelected: boolean;
  isDraggable: boolean;
  onDragEnd?: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  onClick?: () => void;
}

export const Disc = forwardRef<HTMLDivElement, DiscProps>(function Disc(
  { size, isTop, isSelected, isDraggable, onDragEnd, onClick },
  ref
) {
  const w = discWidth(size);
  const p = discPalette(size);
  return (
    <motion.div
      ref={ref}
      layout
      layoutId={`disc-${size}`}
      drag={isDraggable}
      dragSnapToOrigin
      dragElastic={0.15}
      whileDrag={{ scale: 1.04, zIndex: 50 }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      initial={false}
      animate={{
        y: isSelected ? -14 : 0,
        scale: isSelected ? 1.02 : 1,
      }}
      transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
      className="relative rounded-full select-none touch-none"
      style={{
        width: w,
        height: DISC_HEIGHT,
        cursor: isDraggable ? "grab" : "default",
        background: `linear-gradient(180deg, ${p.from} 0%, ${p.via} 45%, ${p.to} 100%)`,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.55),
          inset 0 -8px 14px rgba(0,0,0,0.25),
          0 8px 22px -8px ${p.glow},
          0 0 ${isSelected ? "26px" : "10px"} ${isSelected ? p.glow : "rgba(0,0,0,0.35)"}
        `,
      }}
    >
      {/* glossy highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-2 right-2 top-[2px] h-[6px] rounded-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 100%)",
          filter: "blur(0.5px)",
        }}
      />
      {/* size pip */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white/70 drop-shadow">
        {size}
      </span>
      {/* selected ring (only when top) */}
      {isTop && isSelected && (
        <motion.span
          aria-hidden
          className="absolute inset-[-3px] rounded-full"
          style={{
            border: "1.5px solid rgba(255,255,255,0.6)",
            boxShadow: `0 0 18px ${p.glow}`,
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
});
