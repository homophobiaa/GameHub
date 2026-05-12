import { useMemo, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Search, SearchX } from 'lucide-react';
import type { Game } from '../types/game';
import GameCard from './GameCard';

type Props = {
  games: Game[];
};

export default function GamesGrid({ games }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | string>('all');

  const statuses = useMemo(() => {
    const s = new Set(games.map((g) => g.status));
    return ['all', ...Array.from(s)];
  }, [games]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => {
      if (filter !== 'all' && g.status !== filter) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.creator.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)) ||
        g.branch.toLowerCase().includes(q)
      );
    });
  }, [games, query, filter]);

  return (
    <div>
      {/* Toolbar */}
      <div className="mt-10 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games, creators, tags…"
            className="w-full rounded-lg bg-surface-1 border border-hairline pl-9 pr-3 py-2.5
              text-sm text-ink placeholder:text-ink-tertiary
              focus:outline-none focus:ring-2 focus:ring-accent-focus/60 focus:border-hairline-strong
              transition-all"
            aria-label="Search games"
          />
        </div>

        <LayoutGroup id="status-filters">
          <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
            {statuses.map((s) => {
              const isActive = filter === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`relative shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-ink'
                      : 'text-ink-subtle hover:text-ink'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="status-pill"
                      className="absolute inset-0 rounded-full bg-surface-2 border border-hairline-strong"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative capitalize">{s === 'all' ? 'All' : s}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            key="grid"
            className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((g, i) => (
              <GameCard key={g.id} game={g} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="glass-panel py-16 px-6 text-center"
    >
      <div className="mx-auto h-12 w-12 rounded-2xl bg-surface-2 border border-hairline grid place-items-center">
        <SearchX className="h-5 w-5 text-ink-subtle" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink">No games match your filters</h3>
      <p className="mt-1.5 text-sm text-ink-subtle max-w-sm mx-auto">
        Try a different search term or clear the status filter. New projects are added as
        students ship them.
      </p>
    </motion.div>
  );
}
