import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-noto-devanagari)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-lora)', 'Georgia', 'serif'],
        devanagari: ['var(--font-noto-devanagari)', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          subtle: 'hsl(var(--primary-subtle))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          subtle: 'hsl(var(--destructive-subtle))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          subtle: 'hsl(var(--accent-subtle))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          subtle: 'hsl(var(--success-subtle))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          subtle: 'hsl(var(--warning-subtle))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Gamified Learning Dashboard colors from design.md
        'primary-orange': '#E8800A',
        'primary-orange-dark': '#C96A00',
        surface: {
          cream: '#FDEFC3',
          butter: '#FFF4B5',
          yellow: '#FFD966',
          blue: '#DCE8FB',
          pink: '#F9B9B9',
          peach: '#FDD9B5',
          'peach-light': '#FEEBCF',
          white: '#FFFFFF',
        },
        ink: '#1A1A1A',
        'text-primary': '#222222',
        'text-secondary': '#6B6B6B',
        divider: '#DDDDDD',
        podium: {
          1: '#F39C12',
          2: '#8B4A14',
          3: '#D9A21B',
        },
      },
      borderRadius: {
        none: '0',
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': '1.75rem', // 28px - app shell
        card: '1.375rem', // 22px - cards
        tile: '1.125rem', // 18px - stat tiles
        full: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        card: '0 4px 6px rgba(0, 0, 0, 0.12)',
        elevated: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        floating: '0 20px 50px rgba(0, 0, 0, 0.12)',
        shell: '0 20px 50px rgba(0, 0, 0, 0.12)',
        focus: '0 0 0 3px hsl(var(--ring) / 0.35)',
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
      fontSize: {
        hero: ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        title: ['24px', { lineHeight: '1.3', fontWeight: '500' }],
        stat: ['20px', { lineHeight: '1.3', fontWeight: '700' }],
        'card-title': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'nav-item': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'section-label': [
          '14px',
          { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0.05em' },
        ],
        micro: ['11px', { lineHeight: '1.4', fontWeight: '400' }],
        'button-label': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '24px',
        '6': '32px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-up': 'slide-in-up 0.25s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
