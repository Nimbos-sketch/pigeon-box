import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ableton: {
          canvas: "#1a1a1a",
          surface: "#252525",
          pane: "#2d2d2d",
          pane2: "#353535",
          border: "#454545",
          borderLight: "#5a5a5a",
          text: "#f2f2f2",
          muted: "#c2c2c2",
          subtle: "#dedede",
          orange: "#ff764d",
          orangeDark: "#d85f3c",
          lime: "#d4ff7a",
          blue: "#4db8ff"
        }
      },
      fontFamily: {
        ui: ["'Segoe UI'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'SF Mono'", "Menlo", "Consolas", "monospace"]
      },
      boxShadow: {
        inset: "inset 0 1px 0 rgba(255,255,255,0.04)",
        panel: "0 1px 0 rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.02)"
      }
    }
  },
  plugins: []
};

export default config;
