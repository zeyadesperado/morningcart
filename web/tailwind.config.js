/** @type {import('tailwindcss').Config} */
// ── MorningCart design tokens ───────────────────────────────────────────────
// Concept: "the morning counter" — a warm Egyptian ahwa at sunrise.
// Paper + espresso ink + one terracotta action accent + sage for "settled".
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  future: {
    // touch devices must not keep :hover styles stuck after a tap
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // paper / surfaces
        paper: '#F4ECDB',
        'paper-deep': '#EDE2CC',
        card: '#FCF8EF',
        'card-raised': '#FFFDF8',
        // ink / text
        ink: '#2A2018',
        'ink-soft': '#6B5B49',
        'ink-faint': '#6E5E44', // 5.3:1 on paper — stays AA under the grain film
        // hairlines & wash
        line: '#E3D6BE',
        'line-strong': '#D2C2A4',
        'line-bold': '#A08F6C', // interactive-field borders only (3:1 on card-raised)
        wash: '#EFE6D2',
        // terracotta — THE action
        clay: {
          DEFAULT: '#C0552B',
          deep: '#A1431E',
          soft: '#E9C9B6',
          wash: '#F6E7DC',
        },
        // brass / amber — highlights, "who's in" warmth
        brass: {
          DEFAULT: '#C68A2E',
          soft: '#E7C77E',
          wash: '#F4E7C8',
        },
        // sage / olive — paid, settled, success
        sage: {
          DEFAULT: '#5E6B41',
          deep: '#46512F',
          soft: '#CBD2B4',
          wash: '#E7EBD8',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.85rem', { lineHeight: '1.3rem' }],
        base: ['0.95rem', { lineHeight: '1.5rem' }],
        lg: ['1.075rem', { lineHeight: '1.6rem' }],
        xl: ['1.3rem', { lineHeight: '1.7rem' }],
        '2xl': ['1.65rem', { lineHeight: '1.85rem' }],
        '3xl': ['2.15rem', { lineHeight: '2.2rem' }],
        '4xl': ['2.9rem', { lineHeight: '2.95rem' }],
        '5xl': ['3.9rem', { lineHeight: '3.9rem' }],
      },
      borderRadius: {
        sm: '0.4rem',
        md: '0.7rem',
        lg: '1.05rem',
        xl: '1.5rem',
        '2xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(74, 54, 32, 0.05), 0 8px 24px -12px rgba(74, 54, 32, 0.18)',
        lift: '0 2px 4px rgba(74, 54, 32, 0.06), 0 18px 40px -18px rgba(74, 54, 32, 0.30)',
        inset: 'inset 0 1px 0 rgba(255,253,248,0.7)',
        clay: '0 10px 26px -12px rgba(160, 67, 30, 0.55)',
      },
      spacing: {
        thumb: '4.75rem',
      },
      maxWidth: {
        phone: '30rem',
        app: '78rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-180% 0' },
          '100%': { backgroundPosition: '180% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
