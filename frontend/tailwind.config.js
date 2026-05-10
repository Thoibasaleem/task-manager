/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        ethara: {
          bg: '#140018',
          surface: '#210826',
          border: '#3a1247',
          muted: '#b99ac8',
          accent: '#ffffff',
          accentDim: '#ffffff',
          danger: '#ff5f87',
          warn: '#ffbf69',
        },
      },
    },
  },
  plugins: [],
};
