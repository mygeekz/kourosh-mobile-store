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
          page: "#f4f8ff",
          ink: "#0b1638",
          navy: "#07143d",
          muted: "#71809f",
          line: "#dce6f6",
          blue: "#1769f6",
          "blue-soft": "#e8f1ff",
          violet: "#7c5cff",
          "violet-soft": "#f0ebff",
          mint: "#20cfa4",
          green: "#138c63",
          "mint-soft": "#e4f9f1",
          orange: "#ff9b35",
          "orange-deep": "#bb6416",
          "orange-soft": "#fff0df",
          red: "#ef4444",
          "red-soft": "#fff0f0",
          "slate-soft": "#f5f8fc",
        },
      },
      borderRadius: {
        ...base.theme.extend.borderRadius,
        "premium-card": "28px",
        "premium-hero": "32px",
      },
      boxShadow: {
        "premium-card": "0 18px 50px -34px rgba(33, 70, 138, 0.52), 0 8px 22px -16px rgba(72, 105, 166, 0.30), inset 0 1px 0 rgba(255,255,255,.92)",
        "premium-soft": "0 12px 32px -25px rgba(47, 80, 138, 0.42), inset 0 1px 0 rgba(255,255,255,.92)",
        "premium-float": "0 16px 32px -24px rgba(44, 70, 127, .48), inset 0 1px 0 rgba(255,255,255,.96)",
        "premium-hero": "0 30px 56px -30px rgba(18, 64, 176, .72), inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.15)",
        "premium-dock": "0 24px 48px -30px rgba(40, 72, 136, .58), 0 6px 18px -12px rgba(70, 98, 152, .28), inset 0 1px 0 rgba(255,255,255,.96)",
        "premium-active": "0 18px 36px -22px rgba(23,105,246,.58), inset 0 0 0 1px rgba(23,105,246,.08)",
        "premium-icon-blue": "0 14px 24px -15px rgba(23,105,246,.62), inset 0 1px 0 rgba(255,255,255,.46)",
        "premium-icon-violet": "0 14px 24px -15px rgba(124,92,255,.62), inset 0 1px 0 rgba(255,255,255,.46)",
        "premium-icon-mint": "0 14px 24px -15px rgba(32,207,164,.62), inset 0 1px 0 rgba(255,255,255,.46)",
        "premium-icon-orange": "0 14px 24px -15px rgba(255,155,53,.64), inset 0 1px 0 rgba(255,255,255,.46)",
      },
      backgroundImage: {
        "premium-page-pattern": "radial-gradient(circle at 50% -8%, rgba(118, 155, 255, .20), transparent 30%), radial-gradient(circle at 8% 36%, rgba(86, 211, 255, .08), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #f2f7ff 62%, #f7f9ff 100%)",
        "premium-hero": "radial-gradient(circle at 16% 12%, rgba(120,154,255,.50), transparent 28%), radial-gradient(circle at 80% 120%, rgba(126,76,255,.42), transparent 40%), linear-gradient(135deg, #3158ec 0%, #1453cf 38%, #0a3caa 68%, #172383 100%)",
        "premium-icon-blue": "linear-gradient(145deg, #4f8eff 0%, #1769f6 52%, #1553db 100%)",
        "premium-icon-violet": "linear-gradient(145deg, #a385ff 0%, #7657f7 52%, #5c3adf 100%)",
        "premium-icon-mint": "linear-gradient(145deg, #4ee8c0 0%, #20cfa4 52%, #14a982 100%)",
        "premium-icon-orange": "linear-gradient(145deg, #ffbc68 0%, #ff9b35 52%, #ef7d15 100%)",
      },
    },
  },
};
