/** Thingual Web — Tailwind CSS 3. Кольори = CSS-змінні у форматі "R G B",
 *  тому працюють модифікатори прозорості (bg-accent/10) і тема перемикається класом .dark на <html>. */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
module.exports = {
  content: ['./*.html', './assets/js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), 'surface-alt': c('surface-alt'),
        ink: c('ink'), muted: c('muted'), line: c('line'),
        accent: c('accent'), 'on-accent': c('on-accent'),
        drop: c('drop'), ok: c('ok'), bad: c('bad'),
        brand: { green: '#0F5240', navy: '#0B2350', deep: '#0C2A33' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Thingual Display"', 'Georgia', 'Times New Roman', 'serif'],
      },
      borderRadius: { s: '12px', m: '16px', l: '20px', xl: '28px' },
      maxWidth: { page: '72rem' },
      keyframes: {
        orbit: { to: { transform: 'rotate(360deg)' } },
        pop: { '0%': { transform: 'scale(.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: { orbit: 'orbit 40s linear infinite', pop: 'pop .25s ease-out both' },
    },
  },
  plugins: [],
};
