import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A2E5A',
          light: '#2A4A8A',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F47920',
          light: '#F9A05C',
          foreground: '#FFFFFF',
        },
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
        background: '#F5F7FA',
        surface: '#FFFFFF',
        'surface-alt': '#F0F4F8',
        border: '#E2E8F0',
        'text-primary': '#1A2E5A',
        'text-body': '#374151',
        'text-muted': '#6B7280',
        dark: {
          background: '#0D1B2A',
          surface: '#1A2E5A',
          'surface-alt': '#243B55',
          border: '#2E4A6B',
          'text-primary': '#F1F5F9',
          'text-body': '#CBD5E1',
          'text-muted': '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.12)',
        modal: '0 8px 40px rgba(0,0,0,0.14)',
        float: '0 16px 48px rgba(0,0,0,0.18)',
        'accent-glow': '0 4px 12px rgba(244,121,32,0.35)',
        'logo-glow': '0 0 20px rgba(244,121,32,0.30)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
