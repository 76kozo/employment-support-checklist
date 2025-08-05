import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'japanese': ['Hiragino Sans', 'ヒラギノ角ゴシック', 'Yu Gothic', 'メイリオ', 'Meiryo', 'sans-serif'],
      },
      screens: {
        'tablet': '768px',
        'desktop': '1024px',
      },
    },
  },
  plugins: [
    forms,
  ],
} 