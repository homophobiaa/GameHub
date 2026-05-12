import { motion } from 'framer-motion';

/**
 * Animated decorative background:
 * - dark canvas
 * - subtle grid
 * - two slowly drifting aurora blobs
 * - soft noise texture
 *
 * Pointer-events disabled. Sits behind all content.
 */
export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas-deep"
    >
      {/* subtle grid */}
      <div
        className="absolute inset-0 bg-grid-faint mask-radial-fade opacity-[0.5]"
        style={{ backgroundSize: '56px 56px' }}
      />

      {/* aurora blobs */}
      <motion.div
        className="absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(124,140,255,0.35), rgba(124,140,255,0) 60%)',
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(167,139,250,0.28), rgba(167,139,250,0) 60%)',
        }}
        animate={{ x: [0, -30, 20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10rem] left-1/3 h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(103,232,249,0.16), rgba(103,232,249,0) 60%)',
        }}
        animate={{ x: [0, 20, -30, 0], y: [0, -15, 20, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* faint noise */}
      <div className="absolute inset-0 bg-noise opacity-[0.5] mix-blend-overlay" />

      {/* top vignette */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-canvas-deep to-transparent" />
      {/* bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas-deep to-transparent" />
    </div>
  );
}
