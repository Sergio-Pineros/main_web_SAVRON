import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                'savron-black': '#050505',
                'savron-grey': '#0e0e0e',
                'savron-charcoal': '#181818',
                'savron-concrete': '#242424',
                'savron-green': '#0D3B4F',
                'savron-green-light': '#1A6A8A',
                'savron-silver': '#A3A3A3',
                'savron-silver-muted': '#525252',
                'savron-white': '#FFFFFF',
            },
            fontFamily: {
                sans: ['var(--font-inter)'],
                heading: ['var(--font-montserrat)'],
            },
            borderRadius: {
                'savron': '2px',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'luxury-pulse': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.6s ease-out forwards',
                'fade-in-delay': 'fade-in 0.6s ease-out 0.2s forwards',
                'luxury-pulse': 'luxury-pulse 2s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
export default config;
