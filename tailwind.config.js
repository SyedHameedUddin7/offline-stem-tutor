/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#12172B", // base background — the "no signal" dark
          surface: "#1C2340", // card/panel surface
          raised: "#242C4F", // hover/raised state
        },
        paper: "#EDEAE3", // warm off-white text, not clinical pure white
        solar: {
          DEFAULT: "#F2A93B", // solar-amber accent — the "power" color
          dim: "#B9832E",
        },
        signal: {
          DEFAULT: "#4FD1C5", // teal — the "connected" state color
          dim: "#2F7A72",
        },
        muted: "#6B7394",
        danger: "#E0654F",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "0.375rem",
      },
    },
  },
  plugins: [],
};
