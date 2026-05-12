import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Users, Layers } from 'lucide-react';
import type { NavSection } from './Navbar';

type Props = {
  onNavigate: (s: NavSection) => void;
  gameCount: number;
};

export default function Hero({ onNavigate, gameCount }: Props) {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-1/60 backdrop-blur px-3 py-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium tracking-wide text-ink-muted">
                SoftUni Event 2026 · Student Showcase
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: 'easeOut' }}
              className="heading-display mt-6 text-5xl sm:text-6xl lg:text-7xl text-ink text-balance"
            >
              One hub.<br />
              <span className="text-gradient">Every student game.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 text-lg sm:text-xl text-ink-muted leading-relaxed max-w-xl text-balance"
            >
              GameHub is the launcher for the SoftUni class showcase — a single, polished
              home where every student project lives, plays, and ships.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <button
                onClick={() => onNavigate('games')}
                className="btn-primary group"
              >
                Explore Games
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button onClick={() => onNavigate('team')} className="btn-secondary">
                View Team
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-12 grid grid-cols-3 gap-6 max-w-lg"
            >
              <Stat value={String(gameCount)} label="Student projects" icon={<Layers className="h-4 w-4" />} />
              <Stat value="1" label="Shared hub" icon={<Sparkles className="h-4 w-4" />} />
              <Stat value="SoftUni" label="Event showcase" icon={<Users className="h-4 w-4" />} />
            </motion.div>
          </div>

          {/* Right: hero visual */}
          <div className="lg:col-span-5">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-l border-hairline pl-4">
      <div className="flex items-center gap-1.5 text-ink-tertiary text-[11px] uppercase tracking-[0.18em]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</div>
    </div>
  );
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
      className="relative h-[460px] hidden lg:block"
    >
      {/* glow */}
      <div className="absolute inset-0 -m-10 rounded-[2rem] bg-gradient-to-tr from-accent/20 via-accent-violet/10 to-transparent blur-3xl" />

      {/* Main panel: a mock launcher */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 glass-panel p-5 overflow-hidden"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[11px] font-mono text-ink-tertiary">
            gamehub://library
          </span>
        </div>

        <div className="h-px bg-hairline mb-4" />

        {/* mock list */}
        <div className="space-y-2.5">
          {[
            { n: "Deyan's Game", s: 'In development', c: 'from-accent to-accent-violet' },
            { n: "Radoslav's Game", s: 'In development', c: 'from-cyan-400/80 to-accent' },
            { n: "Ivailo's Game", s: 'In development', c: 'from-accent-violet to-pink-400/80' },
            { n: "Miroslav's Game", s: 'In development', c: 'from-accent to-cyan-400/80' },
            { n: "Hristiqn's Game", s: 'In development', c: 'from-pink-400/80 to-accent' },
          ].map((g, i) => (
            <motion.div
              key={g.n}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
              className="flex items-center gap-3 rounded-lg border border-hairline-subtle bg-surface-2/40 px-3 py-2.5 hover:bg-surface-2 transition-colors"
            >
              <div
                className={`h-9 w-9 rounded-md bg-gradient-to-br ${g.c} relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate">{g.n}</div>
                <div className="text-[11px] text-ink-tertiary">SoftUni · Student</div>
              </div>
              <span className="pill">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
                {g.s}
              </span>
            </motion.div>
          ))}
        </div>

        {/* shimmer bar */}
        <div className="mt-5 h-1 rounded-full overflow-hidden bg-surface-2">
          <div
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent animate-shimmer"
            style={{ backgroundSize: '200% 100%' }}
          />
        </div>
      </motion.div>

      {/* floating side card */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-6 -bottom-6 w-56 glass-panel p-4 shadow-2xl"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-tertiary">
          Now showcasing
        </div>
        <div className="mt-1.5 text-sm font-semibold text-ink">11 student projects</div>
        <div className="mt-3 flex -space-x-2">
          {['#7c8cff', '#a78bfa', '#67e8f9', '#f472b6', '#fbbf24'].map((c, i) => (
            <div
              key={i}
              className="h-7 w-7 rounded-full border-2 border-canvas-deep"
              style={{ background: `linear-gradient(135deg, ${c}, #1a1a28)` }}
            />
          ))}
          <div className="h-7 w-7 rounded-full border-2 border-canvas-deep bg-surface-2 grid place-items-center text-[10px] text-ink-subtle font-medium">
            +6
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
