/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 👈 IMPORTANT: enables manual dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      // ------------ COLOR TOKENS (LIGHT + DARK) ------------
      colors: {
        // Light mode
        lightBg: "#F5F7FA",
        lightSurface: "#FFFFFF",
        lightCard: "#F0F2F5",
        lightBorder: "rgba(0,0,0,0.08)",
        lightText: "#1A1C1E",

        // Dark mode
        darkBg: "#0A1A2F",
        darkSurface: "#0E1B2E",
        darkCard: "#111F36",
        darkBorder: "rgba(255,255,255,0.08)",
        darkText: "#E9EDF2",

        // Brand colors
        brandNavy: "#0A1A2F",
        brandBlue: "#0F62FE",
        brandCyan: "#4CC9F0",
      },

      // ------------ BACKGROUND GRADIENTS ------------
      backgroundImage: {
        // Dark hero background
        "hero-dark":
          "radial-gradient(1200px 600px at 80% -10%, rgba(76,201,240,0.20), transparent 60%), radial-gradient(900px 600px at -10% 80%, rgba(15,98,254,0.20), transparent 60%), linear-gradient(180deg, #0A1A2F 0%, #0E1B2E 60%, #0A1A2F 100%)",

        // Light hero background
        "hero-light":
          "radial-gradient(1200px 600px at 80% -10%, rgba(76,201,240,0.10), transparent 60%), radial-gradient(900px 600px at -10% 80%, rgba(15,98,254,0.08), transparent 60%), linear-gradient(180deg, #F9FBFF 0%, #EDF1F5 60%, #F9FBFF 100%)",
      },

      // ------------ SHADOWS ------------
      boxShadow: {
        "inner-glow": "inset 0 0 80px rgba(76,201,240,0.18)",
        "card-strong": "0 20px 50px rgba(0,0,0,0.35)",

        // for light mode
        "card-soft": "0 12px 24px rgba(0,0,0,0.08)",
      },

      // ------------ BORDERS ------------
      borderColor: {
        brandLine: "rgba(255,255,255,0.08)",
      },
    },
  },
  plugins: [],
};
