/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sarabun: ['Sarabun', 'sans-serif'],
        'noto-serif-thai': ['"Noto Serif Thai"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0f5fc',
          100: '#e1ecf8',
          200: '#c5dcf5',
          300: '#9ac3ef',
          400: '#6aa3e6',
          500: '#4683de',
          600: '#3267d0',
          700: '#2a53be',
          800: '#26449b',
          900: '#233b7b',
          950: '#18264e',
        },
        gold: {
          300: '#f5e0a0',
          400: '#e8c96a',
          500: '#c9a84c',
          600: '#8a6820',
        }
      }
    },
  },
  plugins: [],
}
