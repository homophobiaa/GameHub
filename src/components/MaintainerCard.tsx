import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Github, ExternalLink, Crown, Shield, Zap } from 'lucide-react';

export default function MaintainerCard() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative"
    >
      {/* Animated gradient border wrapper */}
      <div className="relative rounded-3xl p-[1px] overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute -inset-1"
          style={{
            background:
              'conic-gradient(from 0deg, #7c8cff, #a78bfa, #67e8f9, #7c8cff)',
            filter: 'blur(20px)',
            opacity: 0.45,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-3xl"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(124,140,255,0.6), rgba(167,139,250,0.6), rgba(103,232,249,0.4), rgba(124,140,255,0.6))',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        <div
          ref={ref}
          onMouseMove={onMove}
          className="relative rounded-[calc(1.5rem-1px)] bg-canvas-deep overflow-hidden"
        >
          {/* spotlight */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, rgba(124,140,255,0.12), transparent 55%)`,
            }}
          />
          {/* grid */}
          <div
            className="absolute inset-0 bg-grid-faint opacity-40 mask-radial-fade"
            style={{ backgroundSize: '40px 40px' }}
          />

          <div className="relative p-5 sm:p-10 grid sm:grid-cols-[auto_1fr_auto] items-center gap-6 sm:gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-accent/40 to-accent-violet/40 blur-2xl" />
              <div className="relative h-24 w-24 rounded-full ring-2 ring-white/10 overflow-hidden bg-gradient-to-br from-accent to-accent-violet">
                <img
                  src="public/pfp/deyan.jpg"
                  alt="Deyan"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-canvas-deep border-2 border-canvas-deep grid place-items-center">
                <div className="h-full w-full rounded-full bg-gradient-to-br from-amber-300 to-amber-500 grid place-items-center">
                  <Crown className="h-3.5 w-3.5 text-canvas-deep" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-accent">
                <Shield className="h-3.5 w-3.5" />
                Project Lead
              </div>
              <h3 className="mt-1.5 text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
                Deyan
              </h3>
              <p className="mt-2 text-ink-muted leading-relaxed max-w-md">
                Maintainer and team lead of SoftUni GameHub  designed and built the hub
                that brings every student project together.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="pill">
                  <Zap className="h-3 w-3 text-accent" /> Maintainer
                </span>
                <span className="pill">Team Lead</span>
                <span className="pill">Hub Architecture</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-stretch gap-2 sm:min-w-[180px]">
              <a
                href="https://github.com/homophobiaa"
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary"
              >
                <Github className="h-4 w-4" />
                @homophobiaa
              </a>
              <a
                href="https://github.com/homophobiaa"
                target="_blank"
                rel="noreferrer noopener"
                className="btn-secondary"
              >
                Profile
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
