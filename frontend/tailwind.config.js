/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base dark palette
        base: {
          950: "#03030a",
          900: "#0a0a0f",
          800: "#0f0f1a",
          700: "#141420",
          600: "#1a1a2e",
          500: "#1e1e35",
          400: "#252545",
        },
        // Brand colors
        brand: {
          blue:    "#3b82f6",
          purple:  "#8b5cf6",
          teal:    "#06b6d4",
          pink:    "#ec4899",
          amber:   "#f59e0b",
          green:   "#10b981",
        },
        // Glass
        glass: {
          100: "rgba(255,255,255,0.03)",
          200: "rgba(255,255,255,0.06)",
          300: "rgba(255,255,255,0.1)",
          400: "rgba(255,255,255,0.15)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "noise": "url('/noise.svg')",
      },
      boxShadow: {
        glow:      "0 0 20px rgba(59,130,246,0.3)",
        "glow-lg": "0 0 40px rgba(59,130,246,0.4)",
        "glow-purple": "0 0 20px rgba(139,92,246,0.4)",
        card:      "0 4px 24px rgba(0,0,0,0.6)",
        "card-lg": "0 8px 40px rgba(0,0,0,0.8)",
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "shimmer":    "shimmer 1.5s infinite",
        "pulse-slow": "pulse 3s infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer:   { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        glowPulse: {
          "0%,100%": { boxShadow: "0 0 10px rgba(59,130,246,0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(59,130,246,0.5)" },
        },
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
};
