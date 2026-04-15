import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}'],
  // Safelist for runtime-dynamic classes used in testimonials-constants.ts
  // where color values are stored as strings and applied via className dynamically
  safelist: ['bg-blue-500', 'bg-purple-500', 'bg-emerald-600'],
  theme: {
    extend: {
      colors: {
        // Tailwind defaults preserved for safelist (testimonials use dynamic class names)
        blue: { 500: '#3b82f6' },
        purple: { 500: '#a855f7' },
        emerald: { 600: '#059669' },
        primary: {
          DEFAULT: '#E8650A',
          50: '#FEF3EA',
          100: '#FDE7D5',
          200: '#FBCFAB',
          300: '#F8B781',
          400: '#F49F57',
          500: '#E8650A',
          600: '#BA5108',
          700: '#8C3D06',
          800: '#5E2904',
          900: '#2F1402',
        },
        dark: {
          DEFAULT: '#1A2332',
          50: '#E8EAED',
          100: '#C6CBD4',
          200: '#A4ACBB',
          300: '#828DA2',
          400: '#606E89',
          500: '#3E4F70',
          600: '#2C3E5C',
          700: '#1A2332',
          800: '#111827',
          900: '#0A0F17',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F5F7FA',
          border: '#E8EAED',
        },
        success: '#1A7A3C',
        danger: '#C0392B',
        warning: '#D68910',
        // Trading-specific aliases that mirror success/danger for semantic clarity
        buy: 'success', // Alias for success color (buy = positive/green)
        sell: 'danger', // Alias for danger color (sell = negative/red)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'ticker-scroll': 'tickerScroll 30s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tickerScroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}

export default config
