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
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-light)',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          foreground: '#FFFFFF',
        },
        success: 'var(--success)',
        warning: '#CA8A04',
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
      borderRadius: {
        xl:   '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card:           '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover':   '0 8px 32px rgba(0,0,0,0.12)',
        'primary-glow': '0 4px 12px rgba(128,21,27,0.35)',
        'accent-glow':  '0 4px 12px rgba(201,168,76,0.35)',
      },
    },
  },
  plugins: [],
}

export default config
