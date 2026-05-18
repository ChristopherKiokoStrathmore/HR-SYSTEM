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
        primary: { DEFAULT: '#1A2E5A', light: '#2A4A8A', foreground: '#FFFFFF' },
        accent: { DEFAULT: '#F47920', light: '#F9A05C', foreground: '#FFFFFF' },
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}

export default config
