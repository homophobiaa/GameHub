import { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Sparkles, Users } from 'lucide-react';
import type { Game } from '../types/game';
import { pfpPath } from '../types/game';

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

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const hue = hashHue(name);
  const cls = size === 'lg' ? 'h-11 w-11 text-sm' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-9 w-9 text-xs';
  if (!failed) {
    return (
      <img
        src={pfpPath(name)}
        alt={name}
        onError={() => setFailed(true)}
        className={`${cls} rounded-full object-cover ring-1 ring-white/15 shrink-0 bg-surface-2`}
      />
    );
  }
  return (
    <div
      className={`${cls} rounded-full grid place-items-center font-bold text-canvas-deep ring-1 ring-white/10 shrink-0`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 80% 70%), hsl(${(hue + 60) % 360} 75% 60%))`,
      }}
    >
      {initials(name)}
    </div>
  );
}

export default function ContributorsWall({ games }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-tertiary mb-5">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        With games from
      </div>

      {/* contributor chip grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map((g, i) => {
          const isCollab = g.coCreators && g.coCreators.length > 0;
          const hue = hashHue(g.creator);
          const hasGh = g.creatorGithub.trim().length > 0;
          const href = hasGh ? `https://github.com/${g.creatorGithub}` : undefined;

          // For collab games, render a single merged chip showing both creators
          if (isCollab) {
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.03, 0.3) }}
              >
                <div className="group relative block overflow-hidden rounded-2xl border border-hairline bg-surface-1/70 backdrop-blur p-4">
                  <div
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `radial-gradient(280px circle at 50% 0%, hsla(${hue},80%,70%,0.18), transparent 60%)`,
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-tertiary mb-2.5">
                      <Users className="h-3 w-3" />
                      Team
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Main creator */}
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                        title={`@${g.creatorGithub}`}
                      >
                        <Avatar name={g.creator} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{g.creator}</div>
                          <div className="text-[11px] text-ink-subtle font-mono truncate">@{g.creatorGithub}</div>
                        </div>
                      </a>

                      <span className="text-ink-tertiary text-xs">&amp;</span>

                      {/* Co-creator(s) */}
                      {g.coCreators!.map((cc) => (
                        <a
                          key={cc.github}
                          href={`https://github.com/${cc.github}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                          title={`@${cc.github}`}
                        >
                          <Avatar name={cc.name} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{cc.name}</div>
                            <div className="text-[11px] text-ink-subtle font-mono truncate">@{cc.github}</div>
                          </div>
                        </a>
                      ))}

                      <Github className="h-4 w-4 text-ink-tertiary group-hover:text-accent transition-colors shrink-0" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }

          const Wrapper = ({ children }: { children: React.ReactNode }) =>
            hasGh ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative block overflow-hidden rounded-2xl border border-hairline bg-surface-1/70 backdrop-blur p-4
                  hover:border-hairline-strong hover:-translate-y-0.5 transition-all duration-300
                  hover:shadow-[0_18px_50px_-22px_rgba(124,140,255,0.55)]"
              >
                {children}
              </a>
            ) : (
              <div className="group relative block overflow-hidden rounded-2xl border border-hairline bg-surface-1/70 backdrop-blur p-4">
                {children}
              </div>
            );

          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Wrapper>
                {/* glow on hover */}
                <div
                  className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `radial-gradient(280px circle at 50% 0%, hsla(${hue},80%,70%,0.18), transparent 60%)`,
                  }}
                />
                <div className="relative flex items-center gap-3">
                  <Avatar name={g.creator} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink truncate">
                      {g.creator}
                    </div>
                    <div className="text-[11px] text-ink-subtle truncate font-mono">
                      {hasGh ? `@${g.creatorGithub}` : 'GitHub coming soon'}
                    </div>
                  </div>
                  {hasGh && (
                    <Github className="h-4 w-4 text-ink-tertiary group-hover:text-accent transition-colors" />
                  )}
                </div>
              </Wrapper>
            </motion.div>
          );
        })}
      </div>

      {/* Marquee — branches */}
      <div className="relative mt-8 overflow-hidden rounded-xl border border-hairline bg-surface-1/40 backdrop-blur">
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
