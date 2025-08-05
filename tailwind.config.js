/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'navy': {
          DEFAULT: '#003366',
          50: '#0066cc',
          100: '#0052a3',
          200: '#004080',
          300: '#003366',
          400: '#002952',
          500: '#001f3f',
          600: '#001a33',
          700: '#001529',
          800: '#00101f',
          900: '#000a14',
        },
        'gold': {
          DEFAULT: '#FFD700',
          50: '#FFF9E6',
          100: '#FFF3CC',
          200: '#FFE799',
          300: '#FFDB66',
          400: '#FFD433',
          500: '#FFD700',
          600: '#E6C200',
          700: '#B39700',
          800: '#806B00',
          900: '#4D4000',
        }
      },
    },
  },
  plugins: [],
}