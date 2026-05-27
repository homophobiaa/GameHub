import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Disc, DISC_HEIGHT, discWidth } from "./Disc";
import type { RodId, Rods } from "@/types";

interface Props {
  rods: Rods;
  discCount: number;
  selectedRod: RodId | null;
  invalidRod: RodId | null;
  invalidNonce: number;
  disabled: boolean;
  onRodClick: (rod: RodId) => void;
  onDragMove: (from: RodId, to: RodId) => void;
}

const RODS: RodId[] = [0, 1, 2];

export function GameBoard({
  rods,
  discCount,
  selectedRod,
  invalidRod,
  invalidNonce,
  disabled,
  onRodClick,
  onDragMove,
}: Props) {
  const rodRefs = useRef<Array<HTMLButtonElement | null>>([null, null, null]);
  const [hoveredRod, setHoveredRod] = useState<RodId | null>(null);

  // Reset hover state when invalid shake fires (cosmetic)
  useEffect(() => {
    setHoveredRod(null);
  }, [invalidNonce]);

  const columnWidth = Math.max(discWidth(discCount) + 36, 160);

  const handleDragEnd = (from: RodId) =>
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const point = info.point;
      let target: RodId | null = null;
      for (const id of RODS) {
        const el = rodRefs.current[id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (
          point.x >= r.left &&
          point.x <= r.right &&
          point.y >= r.top &&
          point.y <= r.bottom + 40
        ) {
          target = id;
          break;
        }
      }
      setHoveredRod(null);
      if (target == null) return;
      onDragMove(from, target);
    };

  const handleDrag = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const point = info.point;
    let target: RodId | null = null;
    for (const id of RODS) {
      const el = rodRefs.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (point.x >= r.left && point.x <= r.right) {
        target = id;
        break;
      }
    }
    setHoveredRod(target);
  };

  return (
    <div className="w-full">
      <div
        className="relative mx-auto flex items-end justify-center gap-3 sm:gap-6 lg:gap-10 pt-6"
        style={{ height: 320 }}
      >
        {RODS.map((id) => {
          const stack = rods[id];
          const isSelected = selectedRod === id;
          const isHovered = hoveredRod === id;
          const willShake = invalidRod === id;
          return (
            <motion.button
              key={id}
              ref={(el) => {
                rodRefs.current[id] = el;
              }}
              type="button"
              disabled={disabled}
              onClick={() => onRodClick(id)}
              onMouseEnter={() => setHoveredRod(id)}
              onMouseLeave={() => setHoveredRod((h) => (h === id ? null : h))}
              animate={
                willShake
                  ? { x: [0, -10, 10, -7, 7, -3, 3, 0] }
                  : { x: 0 }
              }
              transition={
                willShake
                  ? { duration: 0.5, ease: "easeInOut" }
                  : { duration: 0 }
              }
              className="group relative flex flex-col items-center justify-end pb-0 outline-none"
              style={{ width: columnWidth, height: "100%" }}
            >
              {/* Rod glow halo */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[14px] rounded-full"
                style={{
                  width: columnWidth * 0.7,
                  height: 36,
                  background:
                    "radial-gradient(closest-side, rgba(139,92,246,0.35), rgba(139,92,246,0) 70%)",
                  filter: "blur(6px)",
                  opacity: isHovered || isSelected ? 0.95 : 0.55,
                  transition: "opacity 200ms ease",
                }}
              />

              {/* Rod pole */}
              <div className="relative flex flex-col items-center" style={{ height: 260 }}>
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 rounded-full"
                  style={{
                    width: 6,
                    height: 260,
                    background:
                      "linear-gradient(180deg, rgba(196,181,253,0.85) 0%, rgba(139,92,246,0.6) 60%, rgba(67,56,202,0.6) 100%)",
                    boxShadow:
                      isHovered || isSelected
                        ? "0 0 22px rgba(167,139,250,0.7), inset 0 0 6px rgba(255,255,255,0.4)"
                        : "0 0 10px rgba(139,92,246,0.45), inset 0 0 4px rgba(255,255,255,0.3)",
                    transition: "box-shadow 250ms ease",
                  }}
                />
                {/* Pole tip */}
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 rounded-full"
                  style={{
                    top: -4,
                    width: 14,
                    height: 14,
                    background:
                      "radial-gradient(circle at 35% 30%, #fff 0%, #c4b5fd 40%, #7c3aed 100%)",
                    boxShadow: "0 0 18px rgba(167,139,250,0.8)",
                  }}
                />

                {/* Disc stack (bottom-up) */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col-reverse items-center">
                  {stack.map((size, idx) => {
                    const isTopDisc = idx === stack.length - 1;
                    const showSelected = isSelected && isTopDisc;
                    return (
                      <div
                        key={size}
                        className="flex items-center justify-center"
                        style={{ height: DISC_HEIGHT, marginTop: idx === 0 ? 0 : 2 }}
                      >
                        <Disc
                          size={size}
                          isTop={isTopDisc}
                          isSelected={showSelected}
                          isDraggable={isTopDisc && !disabled}
                          onDragEnd={handleDragEnd(id)}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Drag-over hint */}
                <AnimatePresence>
                  {isHovered && !disabled && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest text-white/50"
                    >
                      rod {id + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Base plate */}
              <div
                aria-hidden
                className="relative mt-0"
                style={{
                  width: columnWidth - 16,
                  height: 14,
                  borderRadius: 10,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.35) 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 30px -10px rgba(139,92,246,0.45)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
              {/* Rod label */}
              <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.2em] text-white/40">
                {id === 0 ? "Start" : id === 2 ? "Target" : "Aux"}
              </div>
            </motion.button>
          );
        })}

        {/* Drag-listener overlay catches mouse moves for hover-state during drag */}
        <DragListener onDrag={handleDrag} />
      </div>
    </div>
  );
}

/**
 * Empty motion.div used to receive pan info; not strictly necessary but we
 * piggy-back on document pointer events to update hover-target while dragging.
 */
function DragListener({
  onDrag,
}: {
  onDrag: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      onDrag(e, {
        point: { x: e.clientX, y: e.clientY },
        delta: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      } as PanInfo);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [onDrag]);
  return null;
}
