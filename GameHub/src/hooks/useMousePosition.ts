import { useEffect, useState } from 'react';

/**
 * Returns the mouse position as a fraction (0..1) of the viewport.
 * Lightweight; throttled via requestAnimationFrame.
 */
export function useMousePosition() {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    let raf = 0;
    let next = { x: 0.5, y: 0.5 };
    const onMove = (e: MouseEvent) => {
      next = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          setPos(next);
          raf = 0;
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return pos;
}
