// Спільне для всіх сторінок: перемикач теми (localStorage), мобільне меню, рік у футері.
import { store } from './storage.js';

const KEY = 'thingual-web:theme';
const root = document.documentElement;

function syncThemeButtons() {
  const dark = root.classList.contains('dark');
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-label', dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему');
    b.setAttribute('aria-pressed', String(dark));
  });
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B2129' : '#0B2238');
}

document.querySelectorAll('[data-theme-toggle]').forEach((b) =>
  b.addEventListener('click', () => {
    const dark = root.classList.toggle('dark');
    try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch { /* приватний режим: тема діє до перезавантаження */ }
    syncThemeButtons();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark } }));
  }),
);
// Якщо користувач не обирав тему вручну — слідуємо за системою.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* ignore */ }
  if (!saved) { root.classList.toggle('dark', e.matches); syncThemeButtons(); }
});
syncThemeButtons();

const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.getElementById('mobile-menu');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  menu.hidden = !open;
}
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
});
window.matchMedia('(min-width: 768px)').addEventListener?.('change', (e) => { if (e.matches && toggle) setMenu(false); });

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

export { store };
