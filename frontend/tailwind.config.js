/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: 'hsl(var(--border))',
          subtle: 'hsl(var(--border-subtle))',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        sidebar: 'hsl(var(--sidebar))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent, var(--muted)))',
          foreground: 'hsl(var(--accent-foreground, var(--foreground)))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
          surface: 'hsl(var(--primary-surface))',
          'surface-border': 'hsl(var(--primary-surface-border))',
        },
        status: {
          success: {
            bg: 'hsl(var(--status-success-bg))',
            text: 'hsl(var(--status-success-text))',
            border: 'hsl(var(--status-success-border))',
          },
          warning: {
            bg: 'hsl(var(--status-warning-bg))',
            text: 'hsl(var(--status-warning-text))',
            border: 'hsl(var(--status-warning-border))',
          },
          info: {
            bg: 'hsl(var(--status-info-bg))',
            text: 'hsl(var(--status-info-text))',
            border: 'hsl(var(--status-info-border))',
          },
          danger: {
            bg: 'hsl(var(--status-danger-bg))',
            text: 'hsl(var(--status-danger-text))',
            border: 'hsl(var(--status-danger-border))',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
