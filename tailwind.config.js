/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- Esta es la parte crítica que te faltaba
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}