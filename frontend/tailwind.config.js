/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'tightest-2': '-0.035em',
      },
      colors: {
        ink: {
          DEFAULT: '#0B0F14',
          soft: '#1A2230',
        },
        sand: {
          50: '#FAFAF7',
          100: '#F4F2EC',
          200: '#E9E5DA',
        },
        accent: {
          50: '#F1F7F4',
          100: '#DCEDE3',
          400: '#3F9D7A',
          500: '#1F8A6C',
          600: '#127857',
          700: '#0B6147',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04)',
        lift: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -10px rgba(15, 23, 42, 0.12)',
        pop: '0 2px 4px rgba(15, 23, 42, 0.06), 0 24px 48px -16px rgba(15, 23, 42, 0.16)',
        inset: 'inset 0 0 0 1px rgba(15, 23, 42, 0.05)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pop': 'pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer': 'shimmer 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '60%': { opacity: '1', transform: 'scale(1.01)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
