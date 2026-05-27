import { motion } from "framer-motion";

/**
 * Animated aurora background with soft gradient blobs and noise texture.
 * Sits fixed behind all content. Pointer-events: none.
 */
export function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <motion.div
        aria-hidden
        className="absolute -top-1/3 -left-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(closest-side, rgba(139,92,246,0.55), rgba(139,92,246,0) 70%)",
        }}
        animate={{ x: [0, 60, -20, 0], y: [0, 30, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/4 -right-1/4 h-[70vh] w-[70vh] rounded-full blur-3xl opacity-45"
        style={{
          background:
            "radial-gradient(closest-side, rgba(217,70,239,0.5), rgba(217,70,239,0) 70%)",
        }}
        animate={{ x: [0, -40, 20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-1/3 left-1/4 h-[70vh] w-[70vh] rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(34,211,238,0.45), rgba(34,211,238,0) 70%)",
        }}
        animate={{ x: [0, 30, -30, 0], y: [0, -25, 15, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50vh] w-[50vh] rounded-full blur-3xl opacity-30"
        style={{
          background:
            "radial-gradient(closest-side, rgba(245,196,81,0.35), rgba(245,196,81,0) 70%)",
        }}
        animate={{ scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 noise opacity-[0.35] mix-blend-overlay" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,6,13,0.55) 0%, rgba(5,6,13,0) 30%, rgba(5,6,13,0) 70%, rgba(5,6,13,0.7) 100%)",
        }}
      />
    </div>
  );
}
