/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.css",
    "./index.css",
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'rgb(var(--palette-border-subtle-rgb) / <alpha-value>)',
  			input: 'rgb(var(--palette-border-strong-rgb) / <alpha-value>)',
  			ring: 'hsl(var(--primary) / <alpha-value>)',
  			background: 'rgb(var(--palette-page-rgb) / <alpha-value>)',
  			foreground: 'rgb(var(--palette-text-rgb) / <alpha-value>)',
				bg: 'rgb(var(--color-bg) / <alpha-value>)',
				surface: 'rgb(var(--color-surface) / <alpha-value>)',
				surfaceMuted: 'rgb(var(--color-surface-muted-rgb) / <alpha-value>)',
				surfaceElevated: 'rgb(var(--color-surface-elevated-rgb) / <alpha-value>)',
				text: 'rgb(var(--color-text) / <alpha-value>)',
				secondaryText: 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
				mutedText: 'rgb(var(--color-muted) / <alpha-value>)',
				success: 'hsl(var(--success) / <alpha-value>)',
				warning: 'hsl(var(--warning) / <alpha-value>)',
				danger: 'hsl(var(--danger) / <alpha-value>)',
				info: 'hsl(var(--info) / <alpha-value>)',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'rgb(var(--palette-surface-muted-rgb) / <alpha-value>)',
  				foreground: 'rgb(var(--palette-text-muted-rgb) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'rgb(var(--palette-surface-elevated-rgb) / <alpha-value>)',
  				foreground: 'rgb(var(--palette-text-rgb) / <alpha-value>)'
  			},
  			card: {
  				DEFAULT: 'rgb(var(--palette-surface-rgb) / <alpha-value>)',
  				foreground: 'rgb(var(--palette-text-rgb) / <alpha-value>)'
  			},
  			sidebar: {
  				DEFAULT: 'rgb(var(--palette-surface-rgb) / <alpha-value>)',
  				foreground: 'rgb(var(--palette-text-rgb) / <alpha-value>)',
  				primary: 'hsl(var(--primary) / <alpha-value>)',
  				'primary-foreground': 'hsl(var(--primary-foreground))',
  				accent: 'rgb(var(--palette-surface-muted-rgb) / <alpha-value>)',
  				'accent-foreground': 'rgb(var(--palette-text-rgb) / <alpha-value>)',
  				border: 'rgb(var(--palette-border-subtle-rgb) / <alpha-value>)',
  				ring: 'hsl(var(--primary) / <alpha-value>)'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)'
  			],
  			serif: [
  				'var(--font-serif)'
  			],
  			mono: [
  				'var(--font-mono)'
  			]
  		},
  		animation: {
  			'fade-in': 'fade-in 0.5s ease-out',
  			'slide-up': 'slide-up 0.5s ease-out',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					transform: 'translateY(10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} 
