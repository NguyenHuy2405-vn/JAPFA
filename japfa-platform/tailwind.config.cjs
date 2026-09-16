/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Japfa primary
        primary: {
          DEFAULT: '#245d4b',
          hover: '#1b4332',
          soft: '#2f7861',
          light: '#e8f0ec',
        },
        // Background
        background: {
          DEFAULT: '#f5f8f5',
          soft: '#edf3ef',
        },
        // Surface
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#f9fbfa',
        },
        // Text
        ink: {
          DEFAULT: '#14231d',
          soft: '#4b6258',
          muted: '#8fa398',
        },
        // Border
        line: {
          DEFAULT: '#d8e4dd',
          soft: '#e8efeb',
          strong: '#b8cdc1',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '10px',
        md: '12px',
        lg: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
