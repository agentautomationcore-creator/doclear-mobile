/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#1a56db',
        danger: '#dc2626',
        warning: '#f59e0b',
        success: '#16a34a',
        'text-primary': '#1A1A2E',
        'text-secondary': '#6B7280',
        'card-bg': '#F8FAFC',
        border: 'rgba(0,0,0,0.06)',
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
      },
      fontSize: {
        body: ['16px', '24px'],
        caption: ['14px', '20px'],
        heading: ['24px', '32px'],
        'heading-sm': ['20px', '28px'],
      },
    },
  },
  plugins: [],
};
