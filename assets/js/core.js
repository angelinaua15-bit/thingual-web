// Thingual Web — чисті функції без DOM (тестуються в Node: npm test).
// Логіку спроєктовано за відповіддю GitHub Copilot (промпт №3) і виправлено після перевірки.

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const LEITNER_DAYS = [0, 1, 3, 7, 14];
const DAY = 86400000;

export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/** Ціле число з рядка поля вводу. Повертає null для порожнього, тексту, дробових ("2.5", "2,5"), NaN та Infinity. */
export function parseIntStrict(raw) {
  const s = String(raw ?? '').trim();
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

/** Детермінований генератор випадкових чисел (mulberry32) — щоб тести й «слово дня» були відтворюваними. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, random = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Номер дня від 1970-01-01 за місцевим часом (щоб «сьогодні» не змінювалось о 02:00 за UTC). */
export function dayNumber(date = new Date()) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / DAY);
}

/** Слово дня (Daily Drop): однакове для всіх у межах доби, без повторів поспіль. */
export function dailyIndex(n, date = new Date()) {
  if (!n) return -1;
  const r = rng(dayNumber(date) * 2654435761);
  return Math.floor(r() * n);
}

/* ---------------------------- Словник ---------------------------- */

/** Слово з data.json: label = "суп" або ["Suppe", "die", ""] (слово, артикль, романізація). */
export function label(word, lang) {
  const v = word?.labels?.[lang];
  if (!v) return null;
  const [w, a = '', r = ''] = Array.isArray(v) ? v : [v];
  return w ? { w, a, r } : null;
}

/** Текст для показу: «die Suppe», «la sopa», «汤». */
export function display(word, lang) {
  const l = label(word, lang);
  if (!l) return '';
  return l.a ? (l.a.endsWith('’') || l.a.endsWith("'") ? l.a + l.w : `${l.a} ${l.w}`) : l.w;
}

/** Для пошуку: нижній регістр, без діакритики й апострофів (café → cafe, П’ятниця → пятниця). */
export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`ʼ]/g, '').trim();
}

/** Фільтр словника. Пошук — у будь-якій з 16 мов, у романізації та в id. */
export function filterWords(words, { q = '', topic = 'all', level = 'all', lang = 'en' } = {}) {
  const nq = norm(q);
  return words.filter((w) => {
    if (topic !== 'all' && w.topic !== topic) return false;
    if (level !== 'all' && w.level !== level) return false;
    if (!label(w, lang)) return false;
    if (!nq) return true;
    if (norm(w.id).includes(nq)) return true;
    return Object.keys(w.labels).some((k) => {
      const l = label(w, k);
      return norm(l.w).includes(nq) || (l.r && norm(l.r).includes(nq));
    });
  });
}

export function sortWords(words, by, lang) {
  const a = words.slice();
  if (by === 'level') a.sort((x, y) => LEVELS.indexOf(x.level) - LEVELS.indexOf(y.level) || x.id.localeCompare(y.id));
  else if (by === 'alpha') a.sort((x, y) => (label(x, lang)?.w || '').localeCompare(label(y, lang)?.w || '', lang));
  return a;
}

/* --------------------------- Тест рівня --------------------------- */

export const nextLevelIndex = (i, correct) => clamp(i + (correct ? 1 : -1), 0, LEVELS.length - 1);

/** Наступне питання: слово потрібного рівня, без повторів; якщо таких немає — найближчі рівні (±1, ±2…). */
export function pickWord(words, lang, levelIdx, usedIds, random = Math.random) {
  for (let d = 0; d < LEVELS.length; d++) {
    const levels = d === 0 ? [levelIdx] : [levelIdx - d, levelIdx + d];
    const pool = words.filter((w) => levels.includes(LEVELS.indexOf(w.level)) && !usedIds.has(w.id) && label(w, lang));
    if (pool.length) return pool[Math.floor(random() * pool.length)];
  }
  return null;
}

/** 4 варіанти: правильний + 3 хибні з тієї ж теми (потім — того ж рівня, потім будь-які), без однакового тексту. */
export function buildOptions(word, words, lang, random = Math.random, count = 4) {
  const correct = display(word, lang);
  const seen = new Set([norm(label(word, lang).w)]);
  const out = [];
  const tiers = [
    (w) => w.topic === word.topic,
    (w) => w.level === word.level,
    () => true,
  ];
  for (const ok of tiers) {
    for (const w of shuffle(words, random)) {
      if (out.length >= count - 1) break;
      if (w.id === word.id || !ok(w)) continue;
      const l = label(w, lang);
      if (!l || seen.has(norm(l.w))) continue;
      seen.add(norm(l.w));
      out.push(display(w, lang));
    }
  }
  return shuffle([correct, ...out], random);
}

/**
 * Оцінка рівня після адаптивного тесту.
 * Copilot пропонував рахувати лише частку правильних (90 % → C2), але в адаптивному тесті людина,
 * що відповідала на A1–A2, теж може мати 90 %. Тому рівень = найвищий рівень, на якому є щонайменше
 * дві відповіді і точність ≥ 60 %, а якщо такого немає — рівень, нижчий за перший рівень з помилками.
 */
export function estimateLevel(answers) {
  if (!answers.length) return { level: 'A1', accuracy: 0, byLevel: {} };
  const by = {};
  for (const a of answers) {
    by[a.level] = by[a.level] || { ok: 0, n: 0 };
    by[a.level].n++;
    if (a.correct) by[a.level].ok++;
  }
  let best = -1;
  LEVELS.forEach((L, i) => {
    const s = by[L];
    if (s && s.n >= 2 && s.ok / s.n >= 0.6) best = i;
  });
  if (best < 0) {
    const okLevels = answers.filter((a) => a.correct).map((a) => LEVELS.indexOf(a.level));
    best = okLevels.length ? Math.min(...okLevels) : 0;
  }
  const accuracy = answers.filter((a) => a.correct).length / answers.length;
  return { level: LEVELS[best], accuracy, byLevel: by };
}

/* ------------------------- Картки Лейтнера ------------------------ */

/** Нова картка: коробка 0, повторити сьогодні. */
export const newCard = (today) => ({ box: 0, due: today, seen: 0 });

/** Відповідь на картку: «знаю» → наступна коробка, «не знаю» → коробка 0. due — номер дня. */
export function reviewCard(card, knew, today) {
  const box = knew ? Math.min(card.box + 1, LEITNER_DAYS.length - 1) : 0;
  const wait = knew ? Math.max(1, LEITNER_DAYS[box]) : 0;
  return { box, due: today + wait, seen: (card.seen || 0) + 1 };
}

export const dueIds = (deck, today) => Object.entries(deck).filter(([, c]) => c.due <= today).map(([id]) => id);

export function boxCounts(deck) {
  const c = LEITNER_DAYS.map(() => 0);
  Object.values(deck).forEach((card) => { c[clamp(card.box, 0, c.length - 1)]++; });
  return c;
}

/* ---------------------------- План ---------------------------- */

export const PLAN_LIMITS = { minutes: [5, 120], days: [1, 7], target: [10, 2000], known: [0, 2000] };
const MIN_PER_NEW_WORD = 3;   // ≈1 хв на знайомство + ≈2 хв на 3–4 повторення в наступні дні
const MAX_NEW_PER_DAY = 25;   // більше нових слів за день погано запам'ятовується — ліміт як у застосунку

/** Перевірка полів плану. Повертає {values} або {errors: {field: текст}}. */
export function validatePlan(raw) {
  const errors = {};
  const values = {};
  const names = { minutes: 'Хвилин на день', days: 'Днів на тиждень', target: 'Ціль', known: 'Уже знаю' };
  for (const [k, [min, max]] of Object.entries(PLAN_LIMITS)) {
    const s = String(raw[k] ?? '').trim();
    if (s === '') {
      if (k === 'known') { values.known = 0; continue; }
      errors[k] = `${names[k]}: введіть число.`;
      continue;
    }
    const n = parseIntStrict(s);
    if (n === null) errors[k] = `${names[k]}: лише ціле число без коми.`;
    else if (n < min || n > max) errors[k] = `${names[k]}: від ${min} до ${max}.`;
    else values[k] = n;
  }
  if (!errors.known && !errors.target && values.known >= values.target) errors.known = 'Уже знаю: має бути менше за ціль.';
  return Object.keys(errors).length ? { errors } : { values };
}

/**
 * Розрахунок плану. Виправлено помилку з відповіді Copilot: він рахував тижні як (слова / слів-на-день) / 7,
 * тобто ніби людина вчиться щодня. Тут кількість навчальних днів ділиться на дні на тиждень.
 */
export function calcPlan({ minutes, days, target, known = 0 }, start = new Date()) {
  const capacity = Math.floor(minutes / MIN_PER_NEW_WORD);
  const perDay = clamp(capacity, 1, MAX_NEW_PER_DAY);
  const left = Math.max(0, target - known);
  const studyDays = Math.ceil(left / perDay);
  const weeks = Math.ceil(studyDays / days);
  const finish = new Date(start.getTime() + weeks * 7 * DAY);
  return { perDay, perWeek: perDay * days, left, studyDays, weeks, finish, capped: capacity > MAX_NEW_PER_DAY, tooShort: capacity < 1 };
}

/* ---------------------------- Форма ---------------------------- */
// Регулярні вирази з відповіді Copilot (промпт №4) після виправлень — див. звіт, розділ «Промпт-паспорт».

/** Ім'я: 2–40 символів; українські й латинські літери; апостроф, дефіс і пробіл лише МІЖ літерами. */
export const NAME_RE = /^(?=.{2,40}$)[A-Za-zА-ЩЬЮЯЄІЇҐа-щьюяєіїґ]+(?:[’'\- ][A-Za-zА-ЩЬЮЯЄІЇҐа-щьюяєіїґ]+)*$/u;
/** Email: щось@домен.зона, без пробілів, зона ≥ 2 літер. Свідомо не «ідеальний» RFC-вираз. */
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
/** Телефон у масці: +380 (XX) XXX-XX-XX. */
export const PHONE_RE = /^\+380 \((\d{2})\) \d{3}-\d{2}-\d{2}$/;
/** Коди мобільних операторів України (Київстар, Vodafone, lifecell, 3Mob, PEOPLEnet, Інтертелеком). */
export const UA_CODES = ['39', '50', '63', '66', '67', '68', '73', '77', '91', '92', '93', '94', '95', '96', '97', '98', '99'];

/** Маска телефону: приймає 0501234567, 380501234567, +38 050 …, 50… і веде до +380 (50) 123-45-67.
 *  Поки людина набирає код країни (+3, +38, +380), показуємо саме його — Copilot тут плутав «38» з кодом оператора. */
export function formatPhone(input) {
  const raw = String(input || '').trim();
  let d = raw.replace(/\D/g, '');
  if (!d) return raw.startsWith('+') ? '+' : '';
  if (/^3(8)?$/.test(d)) return '+' + d;
  if (d.startsWith('380')) d = d.slice(3);
  else if (d.startsWith('80')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 9);
  if (!d) return '+380 (';
  let s = '+380 (' + d.slice(0, 2);
  if (d.length >= 2) s += ')';
  if (d.length > 2) s += ' ' + d.slice(2, 5);
  if (d.length > 5) s += '-' + d.slice(5, 7);
  if (d.length > 7) s += '-' + d.slice(7, 9);
  return s;
}

export function validateField(name, value) {
  const v = typeof value === 'string' ? value.trim() : value;
  switch (name) {
    case 'name':
      if (!v) return 'Вкажіть, як до вас звертатися.';
      if (/\d/.test(v)) return 'Ім’я не може містити цифр.';
      if (v.length < 2 || v.length > 40) return 'Ім’я — від 2 до 40 символів.';
      return NAME_RE.test(v) ? '' : 'Лише літери; апостроф, дефіс чи пробіл — між літерами.';
    case 'email':
      if (!v) return 'Вкажіть email, щоб ми могли відповісти.';
      if (/\s/.test(v)) return 'Email не може містити пробілів.';
      return EMAIL_RE.test(v) ? '' : 'Схоже, email неповний. Приклад: name@gmail.com';
    case 'phone': {
      if (!v) return '';
      const m = PHONE_RE.exec(v);
      if (!m) return 'Номер неповний. Формат: +380 (XX) XXX-XX-XX.';
      return UA_CODES.includes(m[1]) ? '' : `Код оператора (${m[1]}) не схожий на мобільний український.`;
    }
    case 'topic':
      return v ? '' : 'Оберіть тему звернення.';
    case 'message':
      if (!v) return 'Напишіть повідомлення.';
      if (v.length < 10) return `Ще ${10 - v.length} симв. — мінімум 10.`;
      return v.length > 1000 ? 'Максимум 1000 символів.' : '';
    case 'consent':
      return value ? '' : 'Потрібна згода, щоб ми могли відповісти.';
    default:
      return '';
  }
}
