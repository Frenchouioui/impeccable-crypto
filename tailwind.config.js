/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#fafafa",
        muted: "#27272a",
        accent: "#a1a1aa",
        success: {
          DEFAULT: "#10b981", // Emerald
          muted: "rgba(16, 185, 129, 0.15)",
        },
        danger: {
          DEFAULT: "#ef4444", // Rose
          muted: "rgba(239, 68, 68, 0.15)",
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
