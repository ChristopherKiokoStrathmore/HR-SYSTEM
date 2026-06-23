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
        primary: {
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          foreground: '#FFFFFF',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        border: 'var(--border)',
        'text-primary': 'var(--text-primary)',
        'text-body': 'var(--text-body)',
        'text-muted': 'var(--text-muted)',
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
        card:           '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover':   '0 8px 24px rgba(0,0,0,0.10)',
        float:          '0 16px 48px rgba(0,0,0,0.18)',
        'primary-glow': '0 4px 16px rgba(128,21,27,0.35)',
        'accent-glow':  '0 4px 16px rgba(201,168,76,0.35)',
        'success-glow': '0 4px 16px rgba(34,197,94,0.35)',
        'danger-glow':  '0 4px 16px rgba(239,68,68,0.35)',
      },
    },
  },
  plugins: [],
}

export default config
