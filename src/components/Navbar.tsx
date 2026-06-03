import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Menu, X } from 'lucide-react';

export type NavSection = 'home' | 'games' | 'team';

type Props = {
  active: NavSection;
  onNavigate: (s: NavSection) => void;
};

const links: { id: NavSection; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'games', label: 'Games' },
  { id: 'team', label: 'Team' },
];

export default function Navbar({ active, onNavigate }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-canvas-deep/70 backdrop-blur-xl border-b border-hairline'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 group focus:outline-none"
        >
          <div className="relative h-9 w-9 rounded-xl bg-canvas-deep grid place-items-center overflow-hidden ring-1 ring-hairline-strong shadow-[0_0_24px_-6px_rgba(124,140,255,0.7)] group-hover:shadow-[0_0_28px_-4px_rgba(124,140,255,0.9)] transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-accent-violet/20 to-transparent" />
            <img
              src="/logo.svg"
              alt="GameHub"
              className="relative h-6 w-6 object-contain drop-shadow-[0_0_6px_rgba(124,140,255,0.7)]"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              SoftUni <span className="text-gradient">GameHub</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-tertiary mt-0.5">
              Student Showcase
            </span>
          </div>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 relative">
          {links.map((l) => {
            const isActive = active === l.id;
            return (
              <button
                key={l.id}
                onClick={() => onNavigate(l.id)}
                className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-subtle hover:text-ink'
                }`}
              >
                {l.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-3 right-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <a
            href="https://github.com/homophobiaa/GameHub"
            target="_blank"
            rel="noreferrer noopener"
            className="btn-ghost"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
            <span className="hidden lg:inline">GitHub</span>
          </a>
          <button onClick={() => onNavigate('games')} className="btn-primary">
            Explore Games
          </button>
        </div>

        <button
          className="md:hidden p-2 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-1"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-hairline bg-canvas-deep/90 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-1">
              {links.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    onNavigate(l.id);
                    setOpen(false);
                  }}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active === l.id
                      ? 'bg-surface-1 text-ink'
                      : 'text-ink-subtle hover:text-ink hover:bg-surface-1'
                  }`}
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => {
                  onNavigate('games');
                  setOpen(false);
                }}
                className="btn-primary mt-2"
              >
                Explore Games
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
