import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Sparkles, Users, ExternalLink, Gamepad2 } from 'lucide-react';
import type { Game } from '../types/game';
import { pfpPath } from '../types/game';
import { useCanHover } from '../hooks/useCanHover';

type Props = {
  games: Game[];
};

function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Pfp({ name, size }: { name: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const hue = hashHue(name);
  const style = { width: size, height: size };
  if (!failed) {
    return (
      <img
        src={pfpPath(name)}
        alt={name}
        onError={() => setFailed(true)}
        style={style}
        className="rounded-full object-cover ring-2 ring-white/15 shrink-0 bg-surface-2 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full grid place-items-center font-bold text-canvas-deep ring-2 ring-white/15 shrink-0 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]"
    >
      <div
        className="h-full w-full rounded-full grid place-items-center"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 80% 70%), hsl(${(hue + 60) % 360} 75% 60%))`,
          fontSize: Math.max(11, size * 0.32),
        }}
      >
        {initials(name)}
      </div>
    </div>
  );
}

type Person = {
  name: string;
  github: string;
  role: string;
  gameName?: string;
  teammate?: { name: string; github: string };
};

export default function ContributorsWall({ games }: Props) {
  // Build the people list. Project Lead (Deyan) gets a special role.
  const people: Person[] = games.map((g) => {
    const isLead = g.creator.toLowerCase() === 'deyan';
    if (g.coCreators && g.coCreators.length > 0) {
      const cc = g.coCreators[0];
      return {
        name: g.creator,
        github: g.creatorGithub,
        role: 'Game Team',
        gameName: g.name,
        teammate: { name: cc.name, github: cc.github },
      };
    }
    return {
      name: g.creator,
      github: g.creatorGithub,
      role: isLead ? 'Project Lead · Game Creator' : 'Game Creator',
      gameName: g.name,
    };
  });

  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-tertiary mb-5">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        With games from
      </div>

      {/* contributor chip grid — overflow-visible so hover-expanded chips don't get clipped */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" style={{ overflow: 'visible' }}>
        {people.map((p, i) => (
          <ContributorChip key={(p.github || p.name) + i} person={p} index={i} />
        ))}
      </div>

      {/* Marquee — branches */}
      <div className="relative mt-10 overflow-hidden rounded-xl border border-hairline bg-surface-1/40 backdrop-blur">
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-canvas-deep to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-canvas-deep to-transparent z-10" />
        <div className="flex gap-4 py-3 animate-marquee whitespace-nowrap">
          {[...games, ...games].map((g, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 text-[11px] font-mono text-ink-subtle px-3"
            >
              <span className="h-1 w-1 rounded-full bg-accent" />
              <span className="text-ink-muted">{g.branch}</span>
              <span className="text-ink-tertiary">·</span>
              <span>{g.creator}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContributorChip({ person, index }: { person: Person; index: number }) {
  const [hovered, setHovered] = useState(false);
  const canHover = useCanHover();
  const hasGh = person.github.trim().length > 0;
  const hue = hashHue(person.name);
  const isTeam = !!person.teammate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      onHoverStart={() => {
        if (canHover) setHovered(true);
      }}
      onHoverEnd={() => setHovered(false)}
      onFocus={() => {
        if (canHover) setHovered(true);
      }}
      onBlur={() => setHovered(false)}
      animate={{ scale: hovered ? 1.04 : 1, y: hovered ? -4 : 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22, delay: Math.min(index * 0.03, 0.3) }}
      className="relative"
      style={{ zIndex: hovered ? 30 : 1 }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border bg-surface-1/70 backdrop-blur transition-[border-color,box-shadow] duration-300 ${
          hovered
            ? 'border-hairline-strong shadow-[0_24px_60px_-22px_rgba(124,140,255,0.6)]'
            : 'border-hairline'
        }`}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
          style={{
            opacity: hovered ? 1 : 0,
            background: `radial-gradient(320px circle at 50% 0%, hsla(${hue},80%,70%,0.22), transparent 60%)`,
          }}
        />

        <div className="relative p-4 sm:p-5 flex items-center gap-4">
          {/* Avatar(s) */}
          {isTeam ? (
            <div className="flex -space-x-3 shrink-0">
              <div
                className="rounded-full ring-2 ring-surface-1 transition-transform duration-300"
                style={{ zIndex: 2, transform: hovered ? 'translateX(-3px)' : 'none' }}
              >
                <Pfp name={person.name} size={hovered ? 64 : 56} />
              </div>
              <div
                className="rounded-full ring-2 ring-surface-1 transition-transform duration-300"
                style={{ zIndex: 1, transform: hovered ? 'translateX(3px)' : 'none' }}
              >
                <Pfp name={person.teammate!.name} size={hovered ? 64 : 56} />
              </div>
            </div>
          ) : (
            <motion.div
              animate={{ width: hovered ? 72 : 56, height: hovered ? 72 : 56 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="shrink-0"
            >
              <Pfp name={person.name} size={hovered ? 72 : 56} />
            </motion.div>
          )}

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-tertiary">
              {isTeam ? <Users className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-accent" />}
              {person.role}
            </div>
            <div className="mt-0.5 text-base font-semibold text-ink truncate">
              {isTeam ? `${person.name} & ${person.teammate!.name}` : person.name}
            </div>
            {hasGh && (
              <div className="text-[11px] text-ink-subtle font-mono truncate">
                @{person.github}
                {isTeam && person.teammate?.github && <> · @{person.teammate.github}</>}
              </div>
            )}
          </div>

          {hasGh && (
            <Github
              className={`h-4 w-4 shrink-0 transition-colors ${hovered ? 'text-accent' : 'text-ink-tertiary'}`}
            />
          )}
        </div>

        {/* Expanded details */}
        <AnimatePresence initial={false}>
          {hovered && (
            <motion.div
              key="exp"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 border-t border-hairline/70">
                {person.gameName && (
                  <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                    <Gamepad2 className="h-3.5 w-3.5 text-accent" />
                    <span className="text-ink">{person.gameName}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hasGh && (
                    <a
                      href={`https://github.com/${person.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/80 border border-hairline px-2.5 py-1.5 text-[11px] text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
                    >
                      <Github className="h-3.5 w-3.5" />
                      <span className="font-mono">@{person.github}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  )}
                  {isTeam && person.teammate?.github && (
                    <a
                      href={`https://github.com/${person.teammate.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/80 border border-hairline px-2.5 py-1.5 text-[11px] text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
                    >
                      <Github className="h-3.5 w-3.5" />
                      <span className="font-mono">@{person.teammate.github}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
