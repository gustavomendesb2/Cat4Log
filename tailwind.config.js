/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#131313', dim: '#0e0e0e', bright: '#3a3939' },
        on: { surface: '#FFFFFF', variant: '#A1A1A1' },
      },
      borderRadius: { DEFAULT: '4px' },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { studio: '1600px' },
    },
  },
  plugins: [],
}
