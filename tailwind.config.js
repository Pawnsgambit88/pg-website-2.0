/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pg: {
          blue:   '#1565c0',  // logo royal-blue background
          glow:   '#4a9eff',  // logo radial-glow highlight
          silver: '#c8d8ed',  // logo piece silhouette
          dark:   '#0d3a7a',  // logo pawn body
          bg:     '#070f24',  // deep royal-blue site background
        },
        navy: {
          50:  '#e8edf3',
          100: '#c5d0de',
          200: '#9fb0c6',
          300: '#7890ae',
          400: '#587799',
          500: '#385f84',
          600: '#2a4d6e',
          700: '#1e3a55',
          800: '#14293d',
          900: '#0d1b2a',
          950: '#080f18',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
