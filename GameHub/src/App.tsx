import { useCallback, useEffect, useMemo, useState } from 'react';
import { Github, Heart } from 'lucide-react';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import type { NavSection } from './components/Navbar';
import Hero from './components/Hero';
import SectionHeading from './components/SectionHeading';
import GamesGrid from './components/GamesGrid';
import MaintainerCard from './components/MaintainerCard';
import gamesData from './data/games.json';
import type { Game } from './types/game';

const games = gamesData as Game[];

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

  // Update active section while scrolling
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

  return (
    <div className="relative min-h-screen text-ink">
      <AnimatedBackground />
      <Navbar active={active} onNavigate={navigate} />

      <main>
        <section id="home" className="scroll-mt-20">
          <Hero onNavigate={navigate} gameCount={gameCount} />
        </section>

        {/* Divider */}
        <div className="mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-hairline-strong to-transparent" />
        </div>

        <section id="games" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              eyebrow="Game Library"
              title={
                <>
                  Every project, <span className="text-gradient">in one place.</span>
                </>
              }
              description="Browse the work shipped by the SoftUni class. Each game is built and maintained on its own branch by its creator — the hub just gives them a beautiful home."
            />
            <GamesGrid games={games} />
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-hairline-strong to-transparent" />
        </div>

        <section id="team" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              eyebrow="Credits"
              title={
                <>
                  Led, designed and shipped <span className="text-gradient">with care.</span>
                </>
              }
              description="GameHub is a student initiative for the SoftUni showcase. The hub itself — its design, architecture, and integration layer — is maintained by the project lead."
            />
            <div className="mt-12">
              <MaintainerCard />
            </div>

            {/* Contributors strip */}
            <div className="mt-14">
              <div className="text-[11px] uppercase tracking-[0.22em] text-ink-tertiary mb-4">
                With games from
              </div>
              <div className="flex flex-wrap gap-2">
                {games.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-2 rounded-full bg-surface-1 border border-hairline px-3 py-1.5 text-xs text-ink-muted"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent/80" />
                    {g.creator}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline mt-10">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-ink-subtle">
          <span className="font-medium text-ink">SoftUni GameHub</span> · Student showcase
          platform.
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-tertiary">
          <span className="inline-flex items-center gap-1.5">
            Built with <Heart className="h-3 w-3 text-accent" /> for the SoftUni event
          </span>
          <a
            href="https://github.com/deo08mine"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            deo08mine
          </a>
        </div>
      </div>
    </footer>
  );
}
