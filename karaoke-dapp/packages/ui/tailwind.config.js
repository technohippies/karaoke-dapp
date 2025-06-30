/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-in-from-top': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-to-top': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(-100%)' },
        },
        'slide-out-to-bottom': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
        'slide-out-to-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'slide-out-to-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
      },
      animation: {
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'slide-out-to-top': 'slide-out-to-top 0.2s ease-out',
        'slide-out-to-bottom': 'slide-out-to-bottom 0.2s ease-out',
        'slide-out-to-left': 'slide-out-to-left 0.2s ease-out',
        'slide-out-to-right': 'slide-out-to-right 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.animate-in': {
          animationDuration: 'var(--animate-duration, 150ms)',
          animationFillMode: 'both',
        },
        '.animate-out': {
          animationDuration: 'var(--animate-duration, 150ms)',
          animationFillMode: 'both',
        },
        '.fade-in-0': { animationName: 'fade-in' },
        '.fade-out-0': { animationName: 'fade-out' },
        '.slide-in-from-top': { animationName: 'slide-in-from-top' },
        '.slide-in-from-bottom': { animationName: 'slide-in-from-bottom' },
        '.slide-in-from-left': { animationName: 'slide-in-from-left' },
        '.slide-in-from-right': { animationName: 'slide-in-from-right' },
        '.slide-out-to-top': { animationName: 'slide-out-to-top' },
        '.slide-out-to-bottom': { animationName: 'slide-out-to-bottom' },
        '.slide-out-to-left': { animationName: 'slide-out-to-left' },
        '.slide-out-to-right': { animationName: 'slide-out-to-right' },
      });
    },
  ],
};
