// Сторонні бібліотеки через CDN jsDelivr з перевіркою цілісності (SRI) і лінивим підключенням.
export const LIBS = {
  swiperJs: { url: 'https://cdn.jsdelivr.net/npm/swiper@11.2.10/swiper-bundle.min.js', sri: 'sha384-2UI1PfnXFjVMQ7/ZDEF70CR943oH3v6uZrFQGGqJYlvhh4g6z6uVktxYbOlAczav' },
  swiperCss: { url: 'https://cdn.jsdelivr.net/npm/swiper@11.2.10/swiper-bundle.min.css', sri: 'sha384-gAPqlBuTCdtVcYt9ocMOYWrnBZ4XSL6q+4eXqwNycOr4iFczhNKtnYhF3NEXJM51' },
  confetti: { url: 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js', sri: 'sha384-/Ko/tqVwPYurnBe+Mj8WWw+39WmyOZn/kU+neqXn4hRxGI575k07mB/hIekAT51+' },
};
const loaded = new Map();

export function loadScript({ url, sri }) {
  if (!loaded.has(url)) {
    loaded.set(url, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url; s.integrity = sri; s.crossOrigin = 'anonymous'; s.async = true;
      s.onload = resolve;
      s.onerror = () => { loaded.delete(url); reject(new Error('Не вдалося завантажити ' + url)); };
      document.head.append(s);
    }));
  }
  return loaded.get(url);
}

export function loadStyle({ url, sri }, before) {
  if (!loaded.has(url)) {
    loaded.set(url, new Promise((resolve, reject) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = url; l.integrity = sri; l.crossOrigin = 'anonymous';
      l.onload = resolve; l.onerror = reject;
      const first = before || document.querySelector('link[rel="stylesheet"]');
      first ? first.before(l) : document.head.append(l);
    }));
  }
  return loaded.get(url);
}

/** Виконати fn, коли елемент наблизиться до екрана (за margin пікселів). */
export function whenNear(el, fn, margin = 400) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin + 'px 0px' });
  io.observe(el);
}
