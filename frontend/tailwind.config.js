/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f4f3ff',
          100: '#eae8ff',
          200: '#d7d2ff',
          300: '#b9aeff',
          400: '#9582ff',
          500: '#7c5cff',
          600: '#6d3dff',
          700: '#5e29eb',
          800: '#4d22c4',
          900: '#3f1f9e',
          950: '#251056',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)',
        lift: '0 1px 3px rgba(15, 23, 42, 0.08), 0 12px 32px -8px rgba(15, 23, 42, 0.12)',
        glow: '0 0 0 1px rgba(124, 92, 255, 0.20), 0 8px 24px -8px rgba(124, 92, 255, 0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #7c3aed 55%, #a855f7 100%)',
        'mesh-hero':
          'radial-gradient(at 12% 10%, rgba(124,92,255,0.18) 0px, transparent 50%), radial-gradient(at 88% 0%, rgba(168,85,247,0.15) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(99,102,241,0.10) 0px, transparent 55%)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulseDot 1.2s ease-in-out infinite',
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
        pulseDot: {
          '0%, 80%, 100%': { opacity: '0.3', transform: 'scale(0.85)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
