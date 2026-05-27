/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#05060d",
          900: "#0a0c18",
          800: "#11142a",
          700: "#1a1f3d",
        },
        royale: {
          violet: "#8b5cf6",
          indigo: "#6366f1",
          fuchsia: "#d946ef",
          gold: "#f5c451",
          amber: "#fbbf24",
          cyan: "#22d3ee",
          mint: "#34d399",
          rose: "#fb7185",
        },
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(139,92,246,0.6)",
        "glow-gold": "0 0 60px -10px rgba(245,196,81,0.55)",
        "inner-glass": "inset 0 1px 0 0 rgba(255,255,255,0.08)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { transform: "translate3d(0,0,0) rotate(0deg)" },
          "50%": { transform: "translate3d(0,-20px,0) rotate(180deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        aurora: "aurora 20s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        floaty: "floaty 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
