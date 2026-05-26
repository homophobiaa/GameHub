import { motion } from 'framer-motion';
import { Github, GraduationCap, Star } from 'lucide-react';
import type { TeamMember } from '../types/team';

type Props = {
  teacher: TeamMember;
  extras: TeamMember[];
};

export default function TeacherSpotlight({ teacher, extras }: Props) {
  const hasExtras = extras.length > 0;
  return (
    <div className={hasExtras ? 'grid lg:grid-cols-3 gap-5' : 'flex flex-col gap-5'}>
      {/* Teacher */}
      <motion.a
        href={`https://github.com/${teacher.github}`}
        target="_blank"
        rel="noreferrer noopener"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className={`group relative overflow-hidden rounded-2xl border border-hairline bg-surface-1
          hover:border-hairline-strong hover:-translate-y-0.5 transition-all duration-300${hasExtras ? ' lg:col-span-2' : ''}`}
      >
        {/* ambient glow */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.18), transparent 60%)' }} />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(124,140,255,0.18), transparent 60%)' }} />

        <div className="relative p-7 sm:p-8 flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-amber-400/40 to-accent/40 blur-2xl" />
            <div className="relative h-20 w-20 rounded-full ring-2 ring-white/10 bg-gradient-to-br from-amber-300 via-amber-500 to-accent grid place-items-center text-canvas-deep text-2xl font-bold overflow-hidden">
              <GraduationCap className="h-9 w-9" strokeWidth={2.2} />
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-canvas-deep border-2 border-canvas-deep grid place-items-center">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-amber-300 to-amber-500 grid place-items-center">
                <Star className="h-3 w-3 text-canvas-deep" fill="currentColor" />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-amber-300/90">
              <GraduationCap className="h-3.5 w-3.5" />
              {teacher.role}
            </div>
            <h3 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
              {teacher.name}
            </h3>
            <p className="mt-1.5 text-ink-muted leading-relaxed max-w-xl">
              {teacher.description}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0 text-ink-subtle group-hover:text-ink transition-colors">
            <Github className="h-4 w-4" />
            <span className="text-sm font-mono">@{teacher.github}</span>
          </div>
        </div>
      </motion.a>

      {/* Extra contributors */}
      {extras.map((c, i) => (
        <motion.a
          key={c.github}
          href={`https://github.com/${c.github}`}
          target="_blank"
          rel="noreferrer noopener"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
          className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface-1 p-6
            hover:border-hairline-strong hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(103,232,249,0.18), transparent 60%)' }} />

          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/90">
              {c.role}
            </div>
            <h4 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">{c.name}</h4>
            <p className="mt-1.5 text-sm text-ink-subtle leading-relaxed">{c.description}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-ink-subtle group-hover:text-ink transition-colors">
              <Github className="h-4 w-4" />
              <span className="font-mono">@{c.github}</span>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}
