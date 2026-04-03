import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ProTraderSim brand tokens
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
        // Trading specific
        buy: '#1A7A3C',
        sell: '#C0392B',
        profit: '#1A7A3C',
        loss: '#C0392B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        price: ['tabular-nums', 'monospace'],
      },
      fontSize: {
        price: ['1.5rem', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'price-sm': ['1.125rem', { lineHeight: '1', fontWeight: '600' }],
        'price-xs': ['0.875rem', { lineHeight: '1', fontWeight: '500' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-green': 'pulseGreen 0.5s ease-in-out',
        'pulse-red': 'pulseRed 0.5s ease-in-out',
        'ticker-scroll': 'tickerScroll 30s linear infinite',
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
        pulseGreen: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(26, 122, 60, 0.15)' },
        },
        pulseRed: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(192, 57, 43, 0.15)' },
        },
        tickerScroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        modal: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        sidebar: '1px 0 0 0 #E8EAED',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        modal: '0.75rem',
        pill: '9999px',
      },
      spacing: {
        sidebar: '200px',
        header: '56px',
        'trade-panel': '340px',
      },
      zIndex: {
        sidebar: '40',
        header: '50',
        modal: '60',
        toast: '70',
        tooltip: '80',
      },
    },
  },
  plugins: [],
}

export default config
