/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens are driven by CSS variables defined in src/index.css so the
        // whole palette can be themed in one place.
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        jade: "rgb(var(--jade) / <alpha-value>)",
        "jade-soft": "rgb(var(--jade-soft) / <alpha-value>)",
        amber: "rgb(var(--amber) / <alpha-value>)",
        "amber-soft": "rgb(var(--amber-soft) / <alpha-value>)",
        clay: "rgb(var(--clay) / <alpha-value>)",
        "clay-soft": "rgb(var(--clay-soft) / <alpha-value>)",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(16 23 20 / 0.04), 0 8px 24px -12px rgb(16 23 20 / 0.12)",
        hero: "0 20px 50px -24px rgb(8 23 18 / 0.55), 0 4px 12px -6px rgb(8 23 18 / 0.4)",
        soft: "0 1px 2px rgb(16 23 20 / 0.05)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
        "sheet-up": "sheet-up 0.32s cubic-bezier(0.32, 0.72, 0, 1) both",
        "scale-in": "scale-in 0.2s ease both",
      },
    },
  },
  plugins: [],
};
