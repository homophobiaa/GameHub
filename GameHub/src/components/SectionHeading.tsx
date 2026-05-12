import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: Props) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <div className={`max-w-3xl ${alignClass}`}>
      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
          className={`inline-flex items-center gap-2 ${
            align === 'center' ? 'mx-auto' : ''
          } mb-4`}
        >
          <span className="h-px w-6 bg-gradient-to-r from-transparent to-accent" />
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent/90">
            {eyebrow}
          </span>
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-accent" />
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="heading-display text-4xl sm:text-5xl text-ink text-balance"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="mt-4 text-ink-subtle text-lg leading-relaxed text-balance"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
