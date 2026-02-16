/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Terracotta
        primary: {
          DEFAULT: '#d44211',
          50: '#fef3ef',
          100: '#fce6de',
          200: '#f8ccbc',
          300: '#f3ad95',
          400: '#ed8967',
          500: '#e86f42',
          600: '#d44211',
          700: '#a8340d',
          800: '#7c270a',
          900: '#511906',
        },
        // Sandstone Scale
        sandstone: {
          50: '#F7F5F2',
          100: '#EBE8E1',
          200: '#DCD7CC',
          300: '#C7C0B0',
          400: '#A9A08D',
          500: '#8C8370',
          600: '#706859',
          700: '#555045',
          800: '#454037',
          900: '#2d2a25',
        },
        // Background
        background: {
          light: '#f8f6f6',
          dark: '#221510',
        },
        // Log curves
        log: {
          green: '#2d6a4f',
          amber: '#d97706',
          red: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'panel': '2px 2px 0px rgba(199, 192, 176, 0.4)',
        'panel-hover': '3px 3px 0px rgba(199, 192, 176, 0.6)',
      },
    },
  },
  plugins: [],
}
