import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMousePosition } from '../hooks/useMousePosition';

/**
 * Heavy-but-cheap animated background:
 *  - drifting aurora blobs
 *  - mouse-reactive spotlight
 *  - animated grid drift
 *  - canvas particle field (lightweight)
 *  - noise + vignettes
 */
export default function AnimatedBackground() {
  const mouse = useMousePosition();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

    let raf = 0;
    let w = window.innerWidth;
    let h = window.innerHeight;
    const setup = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    };
    setup();
    window.addEventListener('resize', setup);

    const count = Math.min(60, Math.floor((w * h) / 28000));
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.4,
      a: Math.random() * 0.5 + 0.2,
      hue: Math.random() < 0.5 ? 230 : 265,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 85%, 75%, ${p.a})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${p.hue}, 85%, 70%, ${p.a * 0.8})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', setup);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas-deep"
    >
      {/* animated grid */}
      <motion.div
        className="absolute inset-0 bg-grid-faint mask-radial-fade opacity-[0.55]"
        style={{ backgroundSize: '56px 56px' }}
        animate={{ backgroundPosition: ['0px 0px', '56px 56px'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />

      {/* aurora blobs */}
      <motion.div
        className="absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(124,140,255,0.35), rgba(124,140,255,0) 60%)',
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(167,139,250,0.28), rgba(167,139,250,0) 60%)',
        }}
        animate={{ x: [0, -30, 20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10rem] left-1/3 h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(103,232,249,0.16), rgba(103,232,249,0) 60%)',
        }}
        animate={{ x: [0, 20, -30, 0], y: [0, -15, 20, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-70" />

      {/* mouse spotlight */}
      <div
        className="absolute inset-0 transition-[background] duration-300"
        style={{
          background: `radial-gradient(700px circle at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(124,140,255,0.10), transparent 50%)`,
        }}
      />

      {/* faint noise */}
      <div className="absolute inset-0 bg-noise opacity-[0.5] mix-blend-overlay" />

      {/* top vignette */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-canvas-deep to-transparent" />
      {/* bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas-deep to-transparent" />
    </div>
  );
}
