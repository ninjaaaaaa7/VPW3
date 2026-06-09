/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#0B0E14',
          darker: '#05070a',
          lighter: '#161e2b',
          card: '#121722',
          border: '#222f44',
          input: '#1d2736',
        },
        neon: {
          DEFAULT: '#00FF00',
          dim: '#00CC00',
          dark: '#006600',
          light: '#33ff33',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
