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
        primary: '#1E293B',
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'card-bg': '#F8FAFC',
        border: '#E5E7EB',
      },
      borderRadius: {
        card: '12px',
        btn: '12px',
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
