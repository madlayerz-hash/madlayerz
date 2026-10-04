import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#22c55e',
          strong: '#16a34a',
          soft: '#4ade80',
        },
        ink: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
        line: 'var(--line)',
        muted: 'var(--muted)',
        accent: { DEFAULT: 'var(--accent)', text: 'var(--accent-text)' },
        'on-accent': 'var(--on-accent)',
      },
    },
  },
  plugins: [],
};

export default config;
