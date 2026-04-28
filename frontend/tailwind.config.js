/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nic-blue': '#002c5f', // Official Govt Blue
        'parliament-gold': '#d4af37',
      }
    },
  },
  plugins: [],
}