/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',  // This is already correct
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // your existing config
    },
  },
  plugins: [],
}