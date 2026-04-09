const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Inter var", ...fontFamily.sans],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "2px",
        secondary: "2px",
        container: "2px",
      },
      colors: {
        canvas: "#F5F3EF",
        graphite: {
          DEFAULT: "#1C1F24",
          soft: "#3A3F47",
          muted: "#6B7280",
          faint: "#E8E6E1",
        },
        gold: {
          DEFAULT: "#B89A6A",
          light: "#D4BC96",
        },
        teal: {
          DEFAULT: "#2FBFA5",
          light: "#E6F7F4",
          dark: "#1E9E88",
        },
        primary: {
          DEFAULT: "#2FBFA5",
          hover: "#1E9E88",
        },
        secondary: {
          DEFAULT: "#6B7280",
          hover: "#3A3F47",
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
    },
  },
};
