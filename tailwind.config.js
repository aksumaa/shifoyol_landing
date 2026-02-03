/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./pages/**/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2'
        }
      },
      animation: {
        'clip-in': 'clipIn 1.2s cubic-bezier(0.25, 1, 0.5, 1) both'
      },
      keyframes: {
        clipIn: {
          '0%': {
            opacity: '0',
            clipPath: 'inset(0 0 100% 0)'
          },
          '100%': {
            opacity: '1',
            clipPath: 'inset(0 0 0 0)'
          }
        }
      }
    }
  },
  plugins: []
}