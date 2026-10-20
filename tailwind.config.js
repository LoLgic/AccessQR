/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          DEFAULT: '#2563EB',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        ink: '#0F172A',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        scan: {
          '0%, 100%': { top: '14%' },
          '50%': { top: '86%' },
        },
      },
      animation: {
        scan: 'scan 2.6s ease-in-out infinite',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
