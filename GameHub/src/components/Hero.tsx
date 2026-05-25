import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Users, Layers, ChevronDown } from 'lucide-react';
import type { NavSection } from './Navbar';
import Magnetic from './Magnetic';

type Props = {
  onNavigate: (s: NavSection) => void;
  gameCount: number;
};

export default function Hero({ onNavigate, gameCount }: Props) {
  return (
    <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <motion.div
          className="absolute top-24 left-1/2 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(124,140,255,0.35), transparent 60%)' }}
          animate={{ x: [-40, 40, -40], y: [-20, 20, -20] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-1/60 backdrop-blur px-3 py-1.5"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium tracking-wide text-ink-muted">
                SoftUni Event 2026 · Student Showcase
              </span>
            </motion.div>

            <h1 className="heading-display mt-6 text-5xl sm:text-6xl lg:text-7xl text-ink text-balance">
              <RevealLine delay={0.05}>One hub.</RevealLine>
              <RevealLine delay={0.2}><span className="text-gradient">Every student game.</span></RevealLine>
            </h1>

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
              <Magnetic strength={0.25} onClick={() => onNavigate('games')} className="btn-primary group">
                <span className="relative z-10 inline-flex items-center gap-2">
                  Explore Games
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Magnetic>
              <Magnetic strength={0.2} onClick={() => onNavigate('team')} className="btn-secondary">
                View Team
              </Magnetic>
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

        {/* scroll indicator */}
        <motion.button
          onClick={() => onNavigate('games')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="hidden sm:flex absolute left-1/2 -translate-x-1/2 bottom-2 flex-col items-center gap-1.5 text-ink-tertiary hover:text-ink-muted transition-colors"
          aria-label="Scroll to games"
        >
          <span className="text-[10px] uppercase tracking-[0.22em]">Scroll</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="h-7 w-7 rounded-full border border-hairline grid place-items-center"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.div>
        </motion.button>
      </div>
    </section>
  );
}

function RevealLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: '110%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    </span>
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
      className="relative h-[540px] hidden lg:block"
    >
      {/* glow */}
      <div className="absolute inset-0 -m-10 rounded-[2rem] bg-gradient-to-tr from-accent/25 via-accent-violet/15 to-transparent blur-3xl" />

      {/* floating logo badge */}
      <motion.div
        aria-hidden
        className="absolute -top-6 -left-6 h-20 w-20 rounded-2xl bg-canvas-deep border border-hairline-strong grid place-items-center overflow-hidden z-10 shadow-2xl"
        animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-accent-violet/20 to-transparent" />
        <img src="/logo.svg" alt="" className="relative h-10 w-10 drop-shadow-[0_0_12px_rgba(124,140,255,0.9)]" />
      </motion.div>

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
            { n: 'Simon', s: 'Playable', c: 'from-accent to-accent-violet' },
            { n: 'Speed Typing Arena', s: 'Playable', c: 'from-cyan-400/80 to-accent' },
            { n: 'Memory Game', s: 'Playable', c: 'from-accent-violet to-pink-400/80' },
            { n: 'Reaction Grid Game', s: 'Playable', c: 'from-accent to-cyan-400/80' },
            { n: 'Direction Memory', s: 'Playable', c: 'from-pink-400/80 to-accent' },
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
              <span className="pill" style={{ color: g.s === 'Playable' ? 'rgb(134 239 172)' : undefined }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />
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

      {/* floating profile chip — positioned below the main panel */}
      <motion.a
        href="https://github.com/homophobiaa"
        target="_blank"
        rel="noreferrer noopener"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute bottom-4 left-0 w-52 glass-panel p-3 shadow-2xl flex items-center gap-3 hover:border-hairline-strong transition-colors z-20"
      >
        <div className="relative">
          <img src="/pfp.png" alt="Deyan" className="h-10 w-10 rounded-full object-cover ring-2 ring-accent/40" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-canvas-deep animate-pulse-soft" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-tertiary">Project Lead</div>
          <div className="text-sm font-semibold text-ink truncate">@homophobiaa</div>
        </div>
      </motion.a>

      {/* floating side card — positioned below the main panel */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-4 right-0 w-48 glass-panel p-4 shadow-2xl"
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
