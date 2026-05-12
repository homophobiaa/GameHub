import { motion } from 'framer-motion';
import { Code2, Palette, Wand2, Layers3, Github, Gauge } from 'lucide-react';

const stack = [
  { name: 'React 18', desc: 'Composable, modern UI', icon: Code2 },
  { name: 'Vite 5', desc: 'Lightning dev + build', icon: Gauge },
  { name: 'TypeScript', desc: 'Typed end to end', icon: Layers3 },
  { name: 'TailwindCSS', desc: 'Design system in CSS', icon: Palette },
  { name: 'Framer Motion', desc: 'Physical animation', icon: Wand2 },
  { name: 'Git Branches', desc: 'One branch per game', icon: Github },
];

export default function TechStack() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stack.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, delay: Math.min(i * 0.05, 0.3) }}
          className="group relative overflow-hidden rounded-xl border border-hairline bg-surface-1/70 backdrop-blur p-5
            hover:border-hairline-strong transition-colors"
        >
          <div className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'radial-gradient(300px circle at 50% 0%, rgba(124,140,255,0.18), transparent 60%)' }} />
          <div className="relative flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-surface-2 border border-hairline grid place-items-center text-accent group-hover:text-accent-hover transition-colors">
              <t.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{t.name}</div>
              <div className="text-xs text-ink-subtle mt-0.5">{t.desc}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
