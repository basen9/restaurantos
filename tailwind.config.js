/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        deep:   '#0F1117',
        card:   '#1A1D27',
        raised: '#21253A',
        gold:   '#E8B923',
        'gold-dim': '#C49A1A',
        cream:  '#F5F0E8',
        muted:  '#6B7A8D',
        dim:    '#9AAAB8',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
}
