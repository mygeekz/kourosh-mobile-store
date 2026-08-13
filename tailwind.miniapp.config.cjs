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
    },
  },
};
