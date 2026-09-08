/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0d14',
          card: '#111726',
          border: '#1f293d',
          accent: '#06b6d4',
          accentGlow: 'rgba(6, 182, 212, 0.15)',
        }
      }
    },
  },
  plugins: [],
}

