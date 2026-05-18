import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
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
      screens: {
        xs: '375px',
        sm: '390px',
        md: '768px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10)',
        float: '0 16px 48px rgba(0,0,0,0.18)',
        'accent-glow': '0 4px 16px rgba(244,121,32,0.35)',
        'success-glow': '0 4px 16px rgba(34,197,94,0.35)',
        'danger-glow': '0 4px 16px rgba(239,68,68,0.35)',
      },
    },
  },
  plugins: [],
}

export default config
