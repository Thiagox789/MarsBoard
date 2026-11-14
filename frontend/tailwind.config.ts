import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "#0A0E14",
        surface: {
          DEFAULT: "#121826",
          raised: "#1A2233",
          hover: "#222C42",
        },
        line: "#2A3548",
        ink: {
          DEFAULT: "#E8EDF7",
          muted: "#8B96AD",
          dim: "#5A657A",
        },
        ice: {
          DEFAULT: "#5DD6FC",
          dim: "#2A8FB8",
          glow: "rgba(93, 214, 252, 0.15)",
        },
        mars: {
          DEFAULT: "#FF6B35",
          dim: "#C44E22",
          glow: "rgba(255, 107, 53, 0.15)",
        },
        ok: {
          DEFAULT: "#3DFFA0",
          dim: "#1FA86A",
        },
        warn: "#FFC857",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        hud: "0.12em",
      },
      boxShadow: {
        panel: "inset 0 1px 0 rgba(255,255,255,0.04)",
        lock: "0 0 0 1px rgba(93,214,252,0.45), 0 0 24px rgba(93,214,252,0.12)",
      },
      animation: {
        pingSlow: "ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite",
        "fade-in": "fadeIn 0.35s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
