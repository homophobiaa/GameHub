import { useCallback, useEffect, useMemo, useState } from 'react';
import { Github, Heart } from 'lucide-react';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import type { NavSection } from './components/Navbar';
import Hero from './components/Hero';
import SectionHeading from './components/SectionHeading';
import GamesGrid from './components/GamesGrid';
import MaintainerCard from './components/MaintainerCard';
import ContributorsWall from './components/ContributorsWall';
import TeacherSpotlight from './components/TeacherSpotlight';
import TechStack from './components/TechStack';
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

        {/* Built With section */}
        <section className="py-20 sm:py-28">
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

            {/* Teacher + extra contributor */}
            <div className="mt-10">
              <TeacherSpotlight teacher={team.teacher} extras={team.additionalContributors} />
            </div>

            {/* Contributors wall */}
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
