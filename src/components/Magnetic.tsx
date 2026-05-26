import { useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

type Props = {
  children: ReactNode;
  className?: string;
  strength?: number;
  as?: 'button' | 'a' | 'div';
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  ariaLabel?: string;
};

/**
 * Magnetic wrapper — element drifts toward the cursor while hovered.
 * Uses framer-motion springs for buttery feel; falls back to no-op without JS.
 */
export default function Magnetic({
  children,
  className = '',
  strength = 0.35,
  as = 'button',
  href,
  target,
  rel,
  onClick,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const tx = useTransform(sx, (v) => v);
  const ty = useTransform(sy, (v) => v);

  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const common = {
    ref: ref as never,
    onMouseMove: onMove,
    onMouseLeave: onLeave,
    onClick,
    className,
    style: { x: tx, y: ty },
    'aria-label': ariaLabel,
  };

  if (as === 'a') {
    return (
      <motion.a {...common} href={href} target={target} rel={rel}>
        {children}
      </motion.a>
    );
  }
  if (as === 'div') {
    return <motion.div {...common}>{children}</motion.div>;
  }
  return <motion.button {...common}>{children}</motion.button>;
}
