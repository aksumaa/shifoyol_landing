/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./pages/**/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        blue: {
          50: '#F5F9FF',
          100: '#EAF3FF',
          200: '#D4E6FF',
          300: '#A8C9FF',
          400: '#5B9BFF',
          500: '#3185FF',
          600: '#1769FF',
          700: '#1254D4',
          800: '#0E3F9E',
          900: '#0A2A6B'
        },
        cyan: {
          50: '#F5F9FF',
          100: '#EAF3FF',
          200: '#D4E6FF',
          400: '#7AABFF',
          500: '#3185FF',
          600: '#1769FF'
        },
        navy: {
          800: '#0C2348',
          900: '#07152E',
          950: '#040C1C'
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