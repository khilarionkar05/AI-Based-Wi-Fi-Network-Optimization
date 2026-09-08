/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        sidebar: {
          DEFAULT: '#1a1144',
          dark:    '#130d35',
          mid:     '#221558',
          light:   '#2d1f6e',
          border:  'rgba(255,255,255,0.08)',
          text:    'rgba(255,255,255,0.55)',
          hover:   'rgba(255,255,255,0.07)',
          active:  'rgba(139,92,246,0.25)',
        },
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-md': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        'card-lg': '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.05)',
        sidebar: '4px 0 24px 0 rgba(26,17,68,0.18)',
        glow:    '0 0 20px rgba(139,92,246,0.25)',
      },
    },
  },
  plugins: [],
}
