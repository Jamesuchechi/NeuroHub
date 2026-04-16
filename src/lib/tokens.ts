/**
 * Design Tokens for NeuroHub
 * Constants for brand colors, spacing, and UI configurations.
 */

export const TOKENS = {
	COLORS: {
		BRAND_ORANGE: '#f97316',
		BRAND_BLUE: '#2563eb',
		BRAND_GREEN: '#22c55e',
		ZINC: {
			50: '#fafafa',
			100: '#f4f4f5',
			200: '#e4e4e7',
			300: '#d4d4d8',
			400: '#a1a1aa',
			500: '#71717a',
			600: '#52525b',
			700: '#3f3f46',
			800: '#27272a',
			900: '#18181b',
			950: '#09090b',
			1000: '#000000'
		}
	},
	SPACING: {
		SIDEBAR_MIN: 200,
		SIDEBAR_DEFAULT: 260,
		SIDEBAR_MAX: 400,
		CONTEXT_MIN: 0,
		CONTEXT_DEFAULT: 300,
		CONTEXT_MAX: 500
	},
	TRANSITIONS: {
		DEFAULT: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
		FAST: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
		SLOW: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
	}
} as const;
