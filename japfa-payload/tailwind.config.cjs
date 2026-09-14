/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#245d4b',
          hover: '#1b4332',
          soft: '#2f7861',
          light: '#e8f0ec',
        },
        background: {
          DEFAULT: '#f5f8f5',
          soft: '#edf3ef',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#f9fbfa',
        },
        ink: {
          DEFAULT: '#14231d',
          soft: '#4b6258',
          muted: '#8fa398',
        },
        line: {
          DEFAULT: '#d8e4dd',
          soft: '#e8efeb',
          strong: '#b8cdc1',
        },
        japfa: {
          red: '#D32F2F',
          darkRed: '#9A0007',
          blue: '#1976D2',
          gold: '#FFA000',
          bg: '#F8FAFC',
          card: '#FFFFFF',
        },
      },
      borderRadius: {
        sm: '12px',
        md: '16px',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.04)',
        modal: '0 10px 25px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
