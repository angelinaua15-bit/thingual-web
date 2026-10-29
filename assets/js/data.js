// Асинхронне завантаження data.json (fetch + async/await) з перевіркою структури і зрозумілими помилками.
let cache = null;

export class DataError extends Error {}

export async function loadData({ timeout = 10000 } = {}) {
  if (cache) return cache;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch('data.json', { signal: ctrl.signal });
  } catch (e) {
    throw new DataError(e.name === 'AbortError' ? 'Сервер довго не відповідає.' : 'Немає з’єднання з мережею.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new DataError(`Не вдалося завантажити словник (HTTP ${res.status}).`);
  let json;
  try { json = await res.json(); } catch { throw new DataError('Файл словника пошкоджений.'); }
  if (!json || !Array.isArray(json.words) || !json.words.length || !Array.isArray(json.languages)) {
    throw new DataError('У файлі словника неочікувана структура.');
  }
  json.byId = new Map(json.words.map((w) => [w.id, w]));
  json.topicName = Object.fromEntries(json.topics.map((t) => [t.id, t.name]));
  json.lang = Object.fromEntries(json.languages.map((l) => [l.code, l]));
  cache = json;
  return json;
}

export const imgSrc = (w) => `assets/img/emoji/${w.img}.webp`;

/** Блок помилки з кнопкою «Спробувати ще раз». */
export function renderError(el, err, retry) {
  el.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'card mx-auto max-w-md p-6 text-center';
  box.setAttribute('role', 'alert');
  const p = document.createElement('p');
  p.className = 'font-semibold';
  p.textContent = err instanceof DataError ? err.message : 'Щось пішло не так під час завантаження.';
  const s = document.createElement('p');
  s.className = 'mt-1 text-sm text-muted';
  s.textContent = 'Перевірте з’єднання і спробуйте ще раз.';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-primary mt-4';
  b.textContent = 'Спробувати ще раз';
  b.addEventListener('click', retry);
  box.append(p, s, b);
  el.append(box);
}
