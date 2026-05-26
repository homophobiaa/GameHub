import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Heart, Sparkles, Layers, Users, ArrowRight, GraduationCap } from 'lucide-react';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import type { NavSection } from './components/Navbar';
import SectionHeading from './components/SectionHeading';
import GamesGrid from './components/GamesGrid';
import MaintainerCard from './components/MaintainerCard';
import ContributorsWall from './components/ContributorsWall';
import TeacherSpotlight from './components/TeacherSpotlight';
import TechStack from './components/TechStack';
import Magnetic from './components/Magnetic';
import gamesData from './data/games.json';
import teamData from './data/team.json';
import type { Game } from './types/game';
import type { TeamData } from './types/team';

const games = gamesData as Game[];
const team = teamData as TeamData;

const SECTION_IDS: NavSection[] = ['home', 'games', 'team'];

export default function App() {
  const [active, setActive] = useState<NavSection>('home');

  const navigate = useCallback((s: NavSection) => {
    setActive(s);
    const el = document.getElementById(s);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const gameCount = useMemo(() => games.length, []);
  const playableCount = useMemo(
    () => games.filter((g) => g.playUrl && g.playUrl !== '#').length,
    []
  );

  return (
    <div className="relative min-h-screen text-ink">
      <AnimatedBackground />
      <Navbar active={active} onNavigate={navigate} />

      <main>
        {/* HOME = compact intro + games library, all above the fold */}
        <section id="home" className="relative pt-24 sm:pt-28 pb-16 scroll-mt-20">
          {/* Ambient glow behind hero strip */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-16 -z-0">
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 h-72 w-[60rem] max-w-full rounded-full blur-3xl"
              style={{ background: 'radial-gradient(ellipse, rgba(124,140,255,0.22), transparent 65%)' }}
              animate={{ x: ['-4%', '4%', '-4%'] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            {/* Compact intro strip */}
            <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-end mb-10 sm:mb-12">
              <div className="lg:col-span-7">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
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

                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className="heading-display mt-4 text-3xl sm:text-4xl lg:text-5xl text-ink text-balance leading-tight"
                >
                  One hub. <span className="text-gradient">Every student game.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.12 }}
                  className="mt-3 text-sm sm:text-base text-ink-muted max-w-2xl leading-relaxed"
                >
                  The launcher for the SoftUni class showcase — every project lives, plays and ships in one polished place.
                </motion.p>
              </div>

              {/* Right: live stats + actions */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
                className="lg:col-span-5 flex flex-wrap items-center justify-start lg:justify-end gap-2.5"
              >
                <StatChip icon={<Layers className="h-3.5 w-3.5" />} value={String(gameCount)} label="Projects" />
                <StatChip icon={<Sparkles className="h-3.5 w-3.5 text-emerald-300" />} value={String(playableCount)} label="Playable now" />
                <StatChip icon={<GraduationCap className="h-3.5 w-3.5" />} value="SoftUni" label="Event" />
                <Magnetic strength={0.2} onClick={() => navigate('team')} className="btn-secondary !py-2 !px-3 text-xs">
                  <Users className="h-3.5 w-3.5" /> Team
                </Magnetic>
                <Magnetic
                  strength={0.25}
                  onClick={() => {
                    const el = document.getElementById('games-grid');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="btn-primary !py-2 !px-3 text-xs group"
                >
                  Browse <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Magnetic>
              </motion.div>
            </div>

            {/* Games library — visible above the fold */}
            <div id="games" className="scroll-mt-20">
              <div id="games-grid">
                <GamesGrid games={games} />
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-hairline-strong to-transparent" />
        </div>

        {/* Built With */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              eyebrow="Built With"
              title={<>Modern stack, <span className="text-gradient">crafted with care.</span></>}
              description="GameHub is built with a tight, modern frontend toolchain. Every animation, transition, and pixel is intentional."
            />
            <div className="mt-12">
              <TechStack />
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-hairline-strong to-transparent" />
        </div>

        {/* Team / Credits */}
        <section id="team" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              eyebrow="Credits"
              title={<>Led, designed and shipped <span className="text-gradient">with care.</span></>}
              description="GameHub is a student initiative for the SoftUni showcase. The hub itself — its design, architecture, and integration layer — is maintained by the project lead."
            />
            <div className="mt-12">
              <MaintainerCard />
            </div>
            <div className="mt-10">
              <TeacherSpotlight teacher={team.teacher} extras={team.additionalContributors} />
            </div>
            <div className="mt-14">
              <ContributorsWall games={games} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-1/70 backdrop-blur px-3 py-1.5">
      <span className="text-ink-muted">{icon}</span>
      <span className="text-sm font-semibold text-ink leading-none">{value}</span>
      <span className="text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">{label}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline mt-10">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-xl bg-canvas-deep grid place-items-center overflow-hidden ring-1 ring-hairline-strong">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-accent-violet/20 to-transparent" />
            <img src="/logo.svg" alt="GameHub" className="relative h-6 w-6" />
          </div>
          <div className="text-sm text-ink-subtle">
            <span className="font-medium text-ink">SoftUni GameHub</span> · Student showcase platform.
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-tertiary">
          <span className="inline-flex items-center gap-1.5">
            Built with <Heart className="h-3 w-3 text-accent" /> for the SoftUni event
          </span>
          <a
            href="https://github.com/homophobiaa"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            homophobiaa
          </a>
        </div>
      </div>
    </footer>
  );
}
