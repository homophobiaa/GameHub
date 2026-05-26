import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Github, Play, GitBranch, ImageOff, ExternalLink, Lock } from 'lucide-react';
import type { Game } from '../types/game';
import { isExternalUrl, pfpPath } from '../types/game';

type Props = {
  game: Game;
  index: number;
};

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes('play')) return 'text-emerald-300 bg-emerald-400/15 border-emerald-400/30';
  if (s.includes('complete')) return 'text-emerald-300 bg-emerald-400/15 border-emerald-400/30';
  if (s.includes('proto')) return 'text-amber-300 bg-amber-400/15 border-amber-400/30';
  if (s.includes('coming')) return 'text-cyan-300 bg-cyan-400/15 border-cyan-400/30';
  return 'text-accent bg-accent/15 border-accent/30';
}

function initials(name: string) {
  return name
    .split(/[\s-]+/)
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
  const [pfpFailed, setPfpFailed] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20, mass: 0.4 });
  const rotateX = useTransform(srx, (v) => `${v}deg`);
  const rotateY = useTransform(sry, (v) => `${v}deg`);

  const hasGithub = game.creatorGithub.trim().length > 0;
  const githubUrl = hasGithub ? `https://github.com/${game.creatorGithub}` : undefined;
  const isPlayable = game.playUrl && game.playUrl !== '#';
  const external = isPlayable && isExternalUrl(game.playUrl);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setPos({ x: px * 100, y: py * 100 });
    ry.set((px - 0.5) * 6);
    rx.set(-(py - 0.5) * 6);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const pfp = game.pfp ?? pfpPath(game.creator);

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.32), ease: 'easeOut' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className="group relative overflow-hidden rounded-xl border border-hairline bg-surface-1
        transition-[border-color,box-shadow,transform] duration-300
        hover:border-hairline-strong hover:shadow-[0_20px_50px_-22px_rgba(124,140,255,0.55)]
        will-change-transform aspect-[4/5] flex"
    >
      {/* Background screenshot */}
      <div className="absolute inset-0">
        {!imgFailed && game.screenshot ? (
          <img
            src={game.screenshot}
            alt={`${game.name} screenshot`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
          />
        ) : (
          <ScreenshotFallback name={game.creator} />
        )}
      </div>

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas-deep via-canvas-deep/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-canvas-deep/40 via-transparent to-transparent" />

      {/* Cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(360px circle at ${pos.x}% ${pos.y}%, rgba(124,140,255,0.18), transparent 55%)`,
        }}
      />

      {/* Shine sweep */}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out"
        style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)' }}
      />

      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 z-10">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-md ${statusColor(
            game.status
          )}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />
          {game.status}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-canvas-deep/70 backdrop-blur border border-hairline px-2 py-0.5 text-[10px] font-mono text-ink-muted">
          <GitBranch className="h-2.5 w-2.5" />
          {game.branch}
        </span>
      </div>

      {/* Bottom content — slim default, hover-reveal extras */}
      <div className="relative mt-auto w-full p-3.5 sm:p-4 z-10">
        <div className="flex items-center gap-2.5">
          <Avatar name={game.creator} pfp={pfp} failed={pfpFailed} onFail={() => setPfpFailed(true)} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] sm:text-base font-semibold tracking-tight text-ink truncate">
              {game.name}
            </h3>
            <div className="text-[11px] text-ink-subtle truncate">
              by {game.creator}
              {game.coCreators && game.coCreators.length > 0 && (
                <> &amp; {game.coCreators.map((c) => c.name).join(', ')}</>
              )}
            </div>
          </div>
          {isPlayable ? (
            <a
              href={game.playUrl}
              target={external ? '_blank' : '_self'}
              rel={external ? 'noopener noreferrer' : undefined}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 h-9 w-9 rounded-full bg-accent/90 hover:bg-accent grid place-items-center text-canvas-deep
                shadow-[0_8px_24px_-8px_rgba(124,140,255,0.85)] transition-transform hover:scale-105"
              aria-label={`Play ${game.name}`}
              title={external ? 'Open externally' : 'Play'}
            >
              <Play className="h-4 w-4 fill-current" />
            </a>
          ) : (
            <span
              className="shrink-0 h-9 w-9 rounded-full bg-surface-2/80 border border-hairline grid place-items-center text-ink-tertiary"
              title="Coming soon"
              aria-label="Coming soon"
            >
              <Lock className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        {/* Hover/focus reveal */}
        <div
          className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]
            transition-[grid-template-rows] duration-300 ease-out"
        >
          <div className="overflow-hidden">
            <div className="pt-3 mt-3 border-t border-hairline/70 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
              <p className="text-[12.5px] leading-relaxed text-ink-subtle line-clamp-3">
                {game.description}
              </p>

              {game.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {game.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full bg-surface-2/70 border border-hairline px-2 py-0.5 text-[10px] text-ink-subtle"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-1.5">
                {hasGithub && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/80 border border-hairline px-2.5 py-1.5 text-[11px] text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
                    title={`@${game.creatorGithub}`}
                  >
                    <Github className="h-3.5 w-3.5" />
                    <span className="font-mono">@{game.creatorGithub}</span>
                  </a>
                )}
                {isPlayable && (
                  <a
                    href={game.playUrl}
                    target={external ? '_blank' : '_self'}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent/90 hover:bg-accent text-canvas-deep px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Play
                    {external && <ExternalLink className="h-3 w-3 opacity-70" />}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Avatar({
  name,
  pfp,
  failed,
  onFail,
}: {
  name: string;
  pfp: string;
  failed: boolean;
  onFail: () => void;
}) {
  const hue = hashHue(name);
  if (!failed) {
    return (
      <img
        src={pfp}
        alt={name}
        onError={onFail}
        className="h-9 w-9 rounded-full object-cover ring-1 ring-white/15 shrink-0 bg-surface-2"
      />
    );
  }
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
          background: `radial-gradient(circle at 30% 20%, hsl(${hue} 70% 28% / 0.95), transparent 60%),
                       radial-gradient(circle at 80% 80%, hsl(${(hue + 60) % 360} 70% 30% / 0.95), transparent 60%),
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
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
    </div>
  );
}
