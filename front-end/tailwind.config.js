/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#C84B31',
        secondary: '#D6D5A8',
        background: '#222225',
      },
      borderWidth: {
        '3': '3px',
      },
      rotate: {
        '270': '270deg',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable Tailwind's base styles to prevent conflicts with Material UI
  },
  important: '#root', // Make Tailwind styles take precedence over Material UI
}
