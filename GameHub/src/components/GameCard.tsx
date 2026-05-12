import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Github, Play, GitBranch, ImageOff } from 'lucide-react';
import type { Game } from '../types/game';

type Props = {
  game: Game;
  index: number;
};

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes('play')) return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
  if (s.includes('complete')) return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
  if (s.includes('proto')) return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
  if (s.includes('coming')) return 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20';
  return 'text-accent bg-accent/10 border-accent/20';
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export default function GameCard({ game, index }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const hasGithub = game.creatorGithub.trim().length > 0;
  const githubUrl = hasGithub ? `https://github.com/${game.creatorGithub}` : undefined;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.05, 0.4), ease: 'easeOut' }}
      onMouseMove={onMove}
      className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface-1
        transition-all duration-300 hover:border-hairline-strong hover:-translate-y-1
        hover:shadow-[0_24px_60px_-24px_rgba(124,140,255,0.45)]"
    >
      {/* cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(420px circle at ${pos.x}% ${pos.y}%, rgba(124,140,255,0.14), transparent 55%)`,
        }}
      />

      {/* Screenshot area */}
      <div className="relative aspect-[16/10] overflow-hidden border-b border-hairline">
        {!imgFailed ? (
          <img
            src={game.screenshot}
            alt={`${game.name} screenshot`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <ScreenshotFallback name={game.creator} />
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/10 to-transparent" />

        {/* badges over screenshot */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusColor(
              game.status
            )}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />
            {game.status}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas-deep/70 backdrop-blur border border-hairline px-2.5 py-1 text-[11px] font-mono text-ink-muted">
            <GitBranch className="h-3 w-3" />
            {game.branch}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="relative p-5">
        <h3 className="text-lg font-semibold tracking-tight text-ink">{game.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-subtle line-clamp-2">
          {game.description}
        </p>

        {/* tags */}
        {game.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {game.tags.map((t) => (
              <span key={t} className="pill">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* footer */}
        <div className="mt-5 pt-4 border-t border-hairline flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <CreatorAvatar name={game.creator} />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
                Creator
              </div>
              <div className="text-sm font-medium text-ink truncate">{game.creator}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasGithub ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-ghost !px-2.5"
                aria-label={`${game.creator} on GitHub`}
                title={`@${game.creatorGithub}`}
              >
                <Github className="h-4 w-4" />
              </a>
            ) : (
              <span
                className="btn-ghost !px-2.5 opacity-50 cursor-not-allowed"
                title="GitHub coming soon"
                aria-label="GitHub coming soon"
              >
                <Github className="h-4 w-4" />
              </span>
            )}
            <a
              href={game.playUrl}
              className="btn-primary !py-2 !px-3 text-xs"
              aria-label={`Open ${game.name}`}
            >
              <Play className="h-3.5 w-3.5" />
              Open
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function CreatorAvatar({ name }: { name: string }) {
  const hue = hashHue(name);
  return (
    <div
      className="h-9 w-9 rounded-full grid place-items-center text-[11px] font-semibold text-canvas-deep ring-1 ring-white/10 shrink-0"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 80% 70%), hsl(${(hue + 60) % 360} 75% 60%))`,
      }}
    >
      {initials(name)}
    </div>
  );
}

function ScreenshotFallback({ name }: { name: string }) {
  const hue = hashHue(name);
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 20%, hsl(${hue} 70% 30% / 0.9), transparent 60%),
                       radial-gradient(circle at 80% 80%, hsl(${(hue + 60) % 360} 70% 32% / 0.9), transparent 60%),
                       linear-gradient(135deg, #0d0d18, #13131f)`,
        }}
      />
      <div
        className="absolute inset-0 bg-grid-faint opacity-50"
        style={{ backgroundSize: '32px 32px' }}
      />
      <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay" />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <div
          className="h-14 w-14 rounded-2xl grid place-items-center text-base font-bold text-canvas-deep ring-1 ring-white/15 shadow-2xl"
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 80% 72%), hsl(${(hue + 60) % 360} 75% 62%))`,
          }}
        >
          {initials(name)}
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-ink-subtle">
          <ImageOff className="h-3 w-3" />
          Screenshot coming soon
        </div>
      </div>

      {/* shimmer accent */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
    </div>
  );
}
