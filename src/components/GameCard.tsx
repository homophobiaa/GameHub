import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Github, Play, GitBranch, ImageOff, ExternalLink, Lock } from 'lucide-react';
import type { Game } from '../types/game';
import { pfpPath } from '../types/game';
import { useCanHover } from '../hooks/useCanHover';

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

/** Opens the game URL in a new tab with safe rel attributes. */
function openGame(url: string) {
  // Same call for local and external URLs — both must open in a new tab.
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function GameCard({ game, index }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const canHover = useCanHover();
  const [imgFailed, setImgFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20, mass: 0.4 });
  const rotateX = useTransform(srx, (v) => `${v}deg`);
  const rotateY = useTransform(sry, (v) => `${v}deg`);

  const hasGithub = game.creatorGithub.trim().length > 0;
  const githubUrl = hasGithub ? `https://github.com/${game.creatorGithub}` : undefined;
  const isPlayable = !!(game.playUrl && game.playUrl !== '#');

  const clearHover = useCallback(() => {
    setHovered(false);
    setPos({ x: 50, y: 50 });
    rx.set(0);
    ry.set(0);
    cardRef.current?.blur();
  }, [rx, ry]);

  useEffect(() => {
    window.addEventListener('blur', clearHover);
    window.addEventListener('focus', clearHover);
    document.addEventListener('visibilitychange', clearHover);

    return () => {
      window.removeEventListener('blur', clearHover);
      window.removeEventListener('focus', clearHover);
      document.removeEventListener('visibilitychange', clearHover);
    };
  }, [clearHover]);

  const onEnter = () => {
    if (canHover) setHovered(true);
  };

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!canHover) return;
    const el = cardRef.current;
    if (!el) return;
    setHovered(true);
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setPos({ x: px * 100, y: py * 100 });
    ry.set((px - 0.5) * 6);
    rx.set(-(py - 0.5) * 6);
  };
  const onLeave = () => {
    clearHover();
  };

  const onCardClick = (e: MouseEvent<HTMLDivElement>) => {
    clearHover();
    e.currentTarget.blur();
    if (isPlayable) openGame(game.playUrl);
  };
  const onCardKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isPlayable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clearHover();
      e.currentTarget.blur();
      openGame(game.playUrl);
    }
  };

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <motion.div
      ref={cardRef}
      role={isPlayable ? 'link' : undefined}
      tabIndex={isPlayable ? 0 : -1}
      aria-label={isPlayable ? `Play ${game.name}` : `${game.name} (coming soon)`}
      onClick={onCardClick}
      onKeyDown={onCardKey}
      data-hovered={hovered ? 'true' : 'false'}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.32), ease: 'easeOut' }}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className={`group relative overflow-hidden rounded-xl border border-hairline bg-surface-1
        transition-[border-color,box-shadow,transform] duration-300
        data-[hovered=true]:border-hairline-strong data-[hovered=true]:shadow-[0_20px_50px_-22px_rgba(124,140,255,0.55)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-deep
        will-change-transform flex flex-col ${isPlayable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Shine sweep */}
      <div
        className="card-shine pointer-events-none absolute inset-0 -translate-x-full group-data-[hovered=true]:translate-x-full transition-transform duration-[1100ms] ease-out z-20"
        style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)' }}
      />

      {/* === 16:9 Thumbnail === */}
      <div className="thumbnail-frame relative w-full overflow-hidden border-b border-hairline bg-canvas-deep">
        {!imgFailed && game.screenshot ? (
          <img
            src={game.screenshot}
            alt={`${game.name} screenshot`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="thumbnail-image transition-transform duration-700 group-data-[hovered=true]:scale-[1.06]"
          />
        ) : (
          <ScreenshotFallback name={game.creator} />
        )}

        {/* subtle gradient on thumb */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-canvas-deep/70 via-canvas-deep/15 to-transparent" />

        {/* Cursor spotlight only on thumb */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-data-[hovered=true]:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(280px circle at ${pos.x}% ${pos.y}%, rgba(124,140,255,0.20), transparent 55%)`,
          }}
        />

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
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

        {/* Floating play CTA on hover */}
        {isPlayable && (
          <div className="absolute inset-0 grid place-items-center opacity-0 group-data-[hovered=true]:opacity-100 transition-opacity duration-300">
            <div className="h-14 w-14 rounded-full bg-accent text-canvas-deep grid place-items-center shadow-[0_12px_36px_-8px_rgba(124,140,255,0.85)] ring-2 ring-white/20">
              <Play className="h-6 w-6 fill-current translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* === Content === */}
      <div className="relative p-3.5 sm:p-4 flex flex-col gap-3">
        {/* Title row */}
        <div className="flex items-center gap-3">
          <CreatorAvatar game={game} />
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
            <span
              aria-hidden
              className="shrink-0 h-9 w-9 rounded-full bg-accent/90 group-data-[hovered=true]:bg-accent grid place-items-center text-canvas-deep
                shadow-[0_8px_24px_-8px_rgba(124,140,255,0.85)] transition-transform group-data-[hovered=true]:scale-105"
              title="Play"
            >
              <Play className="h-4 w-4 fill-current translate-x-[1px]" />
            </span>
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
          className="grid grid-rows-[0fr] group-data-[hovered=true]:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]
            transition-[grid-template-rows] duration-300 ease-out"
        >
          <div className="overflow-hidden">
            <div className="pt-3 border-t border-hairline/70 opacity-0 group-data-[hovered=true]:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
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
                    onClick={stop}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/80 border border-hairline px-2.5 py-1.5 text-[11px] text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
                    title={`@${game.creatorGithub}`}
                  >
                    <Github className="h-3.5 w-3.5" />
                    <span className="font-mono">@{game.creatorGithub}</span>
                  </a>
                )}
                {game.coCreators?.map((cc) => (
                  <a
                    key={cc.github}
                    href={`https://github.com/${cc.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={stop}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/80 border border-hairline px-2.5 py-1.5 text-[11px] text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
                    title={`@${cc.github}`}
                  >
                    <Github className="h-3.5 w-3.5" />
                    <span className="font-mono">@{cc.github}</span>
                  </a>
                ))}
                {isPlayable && (
                  <span
                    aria-hidden
                    className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent/90 group-data-[hovered=true]:bg-accent text-canvas-deep px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Play
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Single avatar — or overlapping stack when there are co-creators. */
function CreatorAvatar({ game }: { game: Game }) {
  const all = [
    { name: game.creator, github: game.creatorGithub },
    ...(game.coCreators ?? []),
  ];

  if (all.length === 1) {
    return <PfpImage name={all[0].name} size={44} />;
  }

  // Stacked: overlapping with ring so the overlap looks intentional.
  return (
    <div className="flex shrink-0 -space-x-3 group-data-[hovered=true]:-space-x-2 transition-[margin] duration-300">
      {all.map((p, i) => (
        <div
          key={p.github || p.name}
          className="rounded-full ring-2 ring-surface-1 group-data-[hovered=true]:ring-accent/40 transition-[box-shadow,ring-color] duration-300 shadow-[0_4px_14px_-6px_rgba(124,140,255,0.7)]"
          style={{ zIndex: all.length - i }}
        >
          <PfpImage name={p.name} size={40} />
        </div>
      ))}
    </div>
  );
}

function PfpImage({ name, size }: { name: string; size: number }) {
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
        className="rounded-full object-cover ring-1 ring-white/15 shrink-0 bg-surface-2"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full grid place-items-center text-xs font-semibold text-canvas-deep ring-1 ring-white/10 shrink-0"
    >
      <div
        className="h-full w-full rounded-full grid place-items-center"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 80% 70%), hsl(${(hue + 60) % 360} 75% 60%))`,
        }}
      >
        {initials(name)}
      </div>
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
