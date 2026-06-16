/** @type {import('tailwindcss').Config} */
const ch = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: ch('--surface-rgb'),
          dim: ch('--surface-dim-rgb'),
          2: ch('--surface-2-rgb'),
          3: ch('--surface-3-rgb'),
          bright: ch('--surface-bright-rgb'),
        },
        on: {
          surface: ch('--on-surface-rgb'),
          variant: ch('--on-surface-variant-rgb'),
          faint: ch('--on-surface-faint-rgb'),
        },
        accent: {
          DEFAULT: ch('--accent-rgb'),
          strong: ch('--accent-strong-rgb'),
        },
      },
      borderRadius: { DEFAULT: '6px', lg: '14px' },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { studio: '1600px' },
      boxShadow: { card: 'var(--shadow-md)' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { shimmer: 'shimmer 1.6s infinite' },
    },
  },
  plugins: [],
}
