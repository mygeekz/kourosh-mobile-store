const base = require("./tailwind.config.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  content: [
    "./miniapp.html",
    "./miniapp/**/*.{js,ts,jsx,tsx}",
    "./components/lucide-react.tsx",
  ],
  theme: {
    ...base.theme,
    extend: {
      ...base.theme.extend,
      fontFamily: {
        ...base.theme.extend.fontFamily,
        sans: ["Vazir", "Tahoma", "system-ui", "sans-serif"],
      },
      colors: {
        ...base.theme.extend.colors,
        premium: {
          "page": "rgb(var(--ma-canvas) / <alpha-value>)",
          "ink": "rgb(var(--ma-ink) / <alpha-value>)",
          "navy": "rgb(var(--ma-ink) / <alpha-value>)",
          "muted": "rgb(var(--ma-muted-ink) / <alpha-value>)",
          "line": "rgb(var(--ma-line) / <alpha-value>)",
          "blue": "rgb(var(--ma-brand) / <alpha-value>)",
          "blue-soft": "rgb(var(--ma-brand-soft) / <alpha-value>)",
          "violet": "rgb(var(--ma-violet) / <alpha-value>)",
          "violet-soft": "rgb(var(--ma-violet-soft) / <alpha-value>)",
          "mint": "rgb(var(--ma-green) / <alpha-value>)",
          "green": "rgb(var(--ma-green) / <alpha-value>)",
          "mint-soft": "rgb(var(--ma-green-soft) / <alpha-value>)",
          "orange": "rgb(var(--ma-orange) / <alpha-value>)",
          "orange-deep": "rgb(var(--ma-orange) / <alpha-value>)",
          "orange-soft": "rgb(var(--ma-orange-soft) / <alpha-value>)",
          "red": "rgb(var(--ma-red) / <alpha-value>)",
          "red-soft": "rgb(var(--ma-red-soft) / <alpha-value>)",
          "slate-soft": "rgb(var(--ma-muted-surface) / <alpha-value>)",
        },
      },
      borderRadius: {
        ...base.theme.extend.borderRadius,
        "premium-card": "28px",
        "premium-hero": "32px",
      },
      boxShadow: {
        "premium-card": "var(--ma-shadow-card)",
        "premium-soft": "var(--ma-shadow-card)",
        "premium-float": "var(--ma-shadow-card)",
        "premium-hero": "var(--ma-shadow-card)",
        "premium-dock": "var(--ma-shadow-card)",
        "premium-active": "var(--ma-shadow-card)",
        "premium-icon-blue": "var(--ma-shadow-card)",
        "premium-icon-violet": "var(--ma-shadow-card)",
        "premium-icon-mint": "var(--ma-shadow-card)",
        "premium-icon-orange": "var(--ma-shadow-card)",
      },
      backgroundImage: {
        "premium-page-pattern": "none",
        "premium-hero": "linear-gradient(rgb(var(--ma-hero)), rgb(var(--ma-hero)))",
        "premium-icon-blue": "linear-gradient(rgb(var(--ma-hero)), rgb(var(--ma-hero)))",
        "premium-icon-violet": "linear-gradient(rgb(var(--ma-hero)), rgb(var(--ma-hero)))",
        "premium-icon-mint": "linear-gradient(rgb(var(--ma-hero)), rgb(var(--ma-hero)))",
        "premium-icon-orange": "linear-gradient(rgb(var(--ma-hero)), rgb(var(--ma-hero)))",
      },
    },
  },
};
