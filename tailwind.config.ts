import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: { 
      center: true, 
      padding: '1rem', 
      screens: { '2xl': '1200px' } 
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      borderRadius: { '2xl': '1.25rem' },
      boxShadow: { soft: '0 8px 30px rgba(0,0,0,0.06)' }
    }
  },
  plugins: [],
} satisfies Config;
