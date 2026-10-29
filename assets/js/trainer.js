// Тренажер: адаптивний тест рівня, картки Лейтнера, калькулятор плану. Логіка — у core.js (чисті функції).
import { loadData, imgSrc, renderError } from './data.js';
import {
  LEVELS, LEITNER_DAYS, nextLevelIndex, pickWord, buildOptions, estimateLevel, label, display,
  reviewCard, dueIds, boxCounts, dayNumber, validatePlan, calcPlan, shuffle,
} from './core.js';
import { speak, canSpeak } from './speech.js';
import { getLang, setLang, getDeck, saveDeck, addToDeck } from './deck.js';
import { store } from './storage.js';
import { LIBS, loadScript } from './cdn.js';

const $ = (s, el = document) => el.querySelector(s);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const QUESTIONS = 12;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let data;
let lang = 'de';

/* ================================ Вкладки ================================ */
function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (t, focus = true) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
    history.replaceState(null, '', '#' + t.id.replace('tab-', ''));
    if (t.id === 'tab-cards') renderReview();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t, false));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length]); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0]); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1]); }
    });
  });
  const start = tabs.find((t) => t.id === 'tab-' + location.hash.slice(1));
  if (start) select(start, false);
}

/* ================================ Тест рівня ================================ */
let test = null;

function testIntro() {
  const box = $('#test');
  box.innerHTML = '';
  const wrap = h('div', 'grid items-center gap-8 md:grid-cols-[auto_1fr]');
  const img = h('img', 'mx-auto h-28 w-28');
  Object.assign(img, { src: 'assets/img/ui/1f3af.webp', alt: '', width: 112, height: 112 });
  const t = h('div');
  t.append(h('h2', 'font-display text-4xl', `Тест рівня: ${data.lang[lang].name}`));
  t.append(h('p', 'mt-2 max-w-xl text-muted', `${QUESTIONS} картинок. Обери, як предмет називається мовою, яку вчиш. Правильна відповідь робить наступне питання складнішим (до C2), помилка — легшим. Можна відповідати клавішами 1–4.`));
  const b = h('button', 'btn-primary mt-6', 'Почати тест');
  b.type = 'button';
  b.addEventListener('click', startTest);
  const last = store.get(`thingual-web:test:${lang}`);
  t.append(b);
  if (last) t.append(h('p', 'mt-3 text-sm text-muted', `Минулого разу: рівень ${last.level}, ${Math.round(last.accuracy * 100)} % правильних (${new Date(last.at).toLocaleDateString('uk-UA')}).`));
  wrap.append(img, t);
  box.append(wrap);
}

function startTest() {
  test = { i: 0, levelIdx: 0, used: new Set(), answers: [], current: null, answered: false };
  nextQuestion();
}

function nextQuestion() {
  if (test.i >= QUESTIONS) { finishTest(); return; }
  const word = pickWord(data.words, lang, test.levelIdx, test.used);
  if (!word) { finishTest(); return; }
  test.used.add(word.id);
  test.current = { word, level: word.level, options: buildOptions(word, data.words, lang) }; // рівень — справжній рівень слова (якщо слів потрібного рівня забракло, береться сусідній)
  test.answered = false;
  renderQuestion();
}

function renderQuestion() {
  const { word, options, level } = test.current;
  const box = $('#test');
  box.innerHTML = '';
  const top = h('div', 'flex flex-wrap items-center justify-between gap-3');
  top.append(h('p', 'text-sm font-semibold', `Питання ${test.i + 1} з ${QUESTIONS}`), h('p', 'rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold', `Рівень питання: ${level}`));
  const bar = h('div', 'mt-3 h-2 overflow-hidden rounded-full bg-surface-alt');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Прогрес тесту');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(QUESTIONS));
  bar.setAttribute('aria-valuenow', String(test.i));
  const fill = h('div', 'h-full rounded-full bg-accent transition-all');
  fill.style.width = `${(test.i / QUESTIONS) * 100}%`;
  bar.append(fill);

  const body = h('div', 'mt-8 grid items-center gap-8 md:grid-cols-[220px_1fr]');
  const img = h('img', 'mx-auto h-40 w-40 animate-pop md:h-52 md:w-52');
  Object.assign(img, { src: imgSrc(word), alt: 'Що на картинці?', width: 208, height: 208 });
  const right = h('div');
  const q = h('h2', 'text-xl font-semibold', `Як це ${data.lang[lang].name.replace(/а$/, 'ою')} мовою?`);
  q.id = 'q-title';
  const opts = h('div', 'mt-5 grid gap-3 sm:grid-cols-2');
  opts.setAttribute('role', 'group');
  opts.setAttribute('aria-labelledby', 'q-title');
  options.forEach((o, k) => {
    const b = h('button', 'flex min-h-[56px] items-center gap-3 rounded-m border border-line bg-surface px-4 py-3 text-left text-lg transition hover:border-accent disabled:cursor-default');
    b.type = 'button';
    b.dataset.value = o;
    const n = h('span', 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-sm font-semibold', String(k + 1));
    n.setAttribute('aria-hidden', 'true');
    const t = h('span', 'word-lang', o);
    t.lang = lang;
    if (data.lang[lang].rtl) t.dir = 'rtl';
    b.append(n, t);
    b.addEventListener('click', () => answer(o));
    opts.append(b);
  });
  const fb = h('div', 'mt-5 min-h-[3rem]');
  fb.id = 'feedback';
  right.append(q, opts, fb);
  body.append(img, right);
  box.append(top, bar, body);
  opts.querySelector('button')?.focus({ preventScroll: true });
}

function answer(value) {
  if (test.answered) return;
  test.answered = true;
  const { word, level } = test.current;
  const right = display(word, lang);
  const correct = value === right;
  test.answers.push({ id: word.id, level, correct });
  test.levelIdx = nextLevelIndex(LEVELS.indexOf(level), correct);
  test.i++;
  document.querySelectorAll('#test [data-value]').forEach((b) => {
    b.disabled = true;
    if (b.dataset.value === right) b.classList.add('border-ok', 'bg-ok/10');
    else if (b.dataset.value === value) b.classList.add('border-bad', 'bg-bad/10');
  });
  const fb = $('#feedback');
  fb.innerHTML = '';
  const msg = h('p', correct ? 'font-semibold text-ok' : 'font-semibold text-bad', correct ? 'Правильно!' : `Ні — це «${right}» (${label(word, 'uk').w}).`);
  msg.setAttribute('role', 'status');
  const row = h('div', 'mt-3 flex flex-wrap gap-2');
  if (canSpeak) {
    const s = h('button', 'btn-secondary min-h-[44px] px-4', 'Вимовити');
    s.type = 'button';
    s.addEventListener('click', () => speak(label(word, lang).w, data.lang[lang].voice));
    row.append(s);
  }
  const next = h('button', 'btn-primary min-h-[44px] px-5', test.i >= QUESTIONS ? 'Результат' : 'Далі →');
  next.type = 'button';
  next.addEventListener('click', nextQuestion);
  row.append(next);
  fb.append(msg, row);
  next.focus({ preventScroll: true });
}

function finishTest() {
  const res = estimateLevel(test.answers);
  store.set(`thingual-web:test:${lang}`, { level: res.level, accuracy: res.accuracy, at: Date.now() });
  const box = $('#test');
  box.innerHTML = '';
  const wrap = h('div', 'grid gap-8 md:grid-cols-[1fr_1fr]');
  const left = h('div');
  left.append(h('p', 'eyebrow', 'Результат'));
  left.append(h('p', 'mt-2 font-display text-7xl', res.level));
  left.append(h('p', 'mt-2 text-muted', `${Math.round(res.accuracy * 100)} % правильних відповідей (${test.answers.filter((a) => a.correct).length} з ${test.answers.length}).`));
  const hint = {
    A1: 'Починай з предметів довкола: їжа, дім, одяг. 5–10 нових слів на день — і за місяць ти помітиш різницю.',
    A2: 'База є. Додавай дії та якості, щоб будувати перші речення.',
    B1: 'Ти впевнено знаєш побутові слова. Час для тем «робота», «суспільство», «почуття».',
    B2: 'Сильний рівень словника. Тренуй абстрактні слова й повторюй їх за розкладом.',
    C1: 'Дуже високий результат — словник цього сайту для тебе замалий. Спробуй застосунок і власні фото.',
    C2: 'Майже всі слова відомі — залишається практика в реальному житті.',
  }[res.level];
  left.append(h('p', 'mt-4', hint));
  const btns = h('div', 'mt-6 flex flex-wrap gap-2');
  const again = h('button', 'btn-secondary', 'Пройти ще раз');
  again.type = 'button';
  again.addEventListener('click', startTest);
  const wrong = test.answers.filter((a) => !a.correct).map((a) => a.id);
  const toDeck = h('button', 'btn-primary', wrong.length ? `Помилки → у картки (${wrong.length})` : 'Усе правильно!');
  toDeck.type = 'button';
  toDeck.disabled = !wrong.length;
  toDeck.addEventListener('click', () => {
    const n = addToDeck(lang, wrong);
    toDeck.textContent = n ? `Додано карток: ${n}` : 'Ці слова вже в картках';
    toDeck.disabled = true;
  });
  const toPlan = h('button', 'btn-secondary', 'Скласти план →');
  toPlan.type = 'button';
  toPlan.addEventListener('click', () => {
    // Орієнтовний словниковий запас для рівня (за поширеними оцінками для CEFR) — лише як стартове значення
    const known = { A1: 100, A2: 500, B1: 1000, B2: 1500, C1: 1500, C2: 1500 }[res.level];
    $('#known').value = String(known);
    const t = Number($('#target').value) || 0;
    if (t <= known) $('#target').value = String(Math.min(2000, known + 500));
    $('#tab-plan').click();
    runPlan();
  });
  btns.append(toDeck, again, toPlan);
  left.append(btns);

  const right = h('div');
  right.append(h('h3', 'font-semibold', 'Відповіді за рівнями'));
  const t = h('table', 'mt-3 w-full text-sm');
  t.innerHTML = '<caption class="sr-only">Правильні відповіді за рівнями CEFR</caption><thead><tr class="text-left text-muted"><th scope="col" class="py-2 font-medium">Рівень</th><th scope="col" class="py-2 font-medium">Правильно</th><th scope="col" class="py-2 font-medium">Шкала</th></tr></thead>';
  const tb = h('tbody');
  LEVELS.forEach((L) => {
    const s = res.byLevel[L];
    const tr = h('tr', 'border-t border-line');
    tr.append(h('th', 'py-2 text-left font-semibold', L));
    tr.lastChild.scope = 'row';
    tr.append(h('td', 'py-2 tabular-nums', s ? `${s.ok} з ${s.n}` : '—'));
    const td = h('td', 'py-2 w-1/2');
    const bar = h('div', 'h-2 rounded-full bg-surface-alt');
    const f = h('div', 'h-2 rounded-full bg-accent');
    f.style.width = s ? `${(s.ok / s.n) * 100}%` : '0';
    bar.append(f);
    td.append(bar);
    tr.append(td);
    tb.append(tr);
  });
  t.append(tb);
  right.append(t);
  right.append(h('p', 'mt-3 text-xs text-muted', 'Оцінка — орієнтир за словниковим запасом, а не офіційний сертифікат CEFR: тест не перевіряє граматику, слухання чи мовлення.'));
  wrap.append(left, right);
  box.append(wrap);
  box.focus?.();
  if (res.accuracy >= 0.75 && !reduced) loadScript(LIBS.confetti).then(() => window.confetti?.({ particleCount: 90, spread: 70, origin: { y: 0.7 } })).catch(() => {});
}

document.addEventListener('keydown', (e) => {
  if ($('#panel-test').hidden || !test?.current || test.answered) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const k = Number(e.key);
  if (k >= 1 && k <= 4) { const o = test.current.options[k - 1]; if (o) { e.preventDefault(); answer(o); } }
});

/* ============================== Картки Лейтнера ============================== */
let review = null;

function renderBoxes() {
  const deck = getDeck(lang);
  const counts = boxCounts(deck);
  const max = Math.max(1, ...counts);
  const ol = $('#boxes');
  ol.innerHTML = '';
  counts.forEach((c, i) => {
    const li = h('li', 'grid grid-cols-[88px_1fr_32px] items-center gap-2 text-sm');
    li.append(h('span', 'text-muted', i === 0 ? 'Щодня' : `${LEITNER_DAYS[i]} дн.`));
    const bar = h('span', 'h-2 rounded-full bg-surface-alt');
    const f = h('span', 'block h-2 rounded-full bg-accent');
    f.style.width = `${(c / max) * 100}%`;
    bar.append(f);
    li.append(bar, h('span', 'text-right tabular-nums', String(c)));
    li.setAttribute('aria-label', `Коробка ${i + 1}: ${c} карток`);
    ol.append(li);
  });
}

function renderReview() {
  renderBoxes();
  const box = $('#review');
  box.innerHTML = '';
  const deck = getDeck(lang);
  const today = dayNumber();
  const due = shuffle(dueIds(deck, today).filter((id) => data.byId.has(id) && label(data.byId.get(id), lang)));
  const total = Object.keys(deck).length;
  if (!total) {
    box.append(h('h2', 'font-display text-4xl', 'Ще немає карток'));
    box.append(h('p', 'mt-2 max-w-md text-muted', 'Додай слова з тесту рівня, словника або кнопкою «+ 10 нових слів». Картки зберігаються окремо для кожної мови.'));
    const a = h('a', 'btn-secondary mt-6', 'Відкрити словник');
    a.href = `dictionary.html?lang=${lang}`;
    box.append(a);
    return;
  }
  if (!due.length) {
    const next = Math.min(...Object.values(deck).map((c) => c.due));
    box.append(h('h2', 'font-display text-4xl', 'На сьогодні все!'));
    box.append(h('p', 'mt-2 text-muted', `У тебе ${total} карток. Наступне повторення — ${next - today === 1 ? 'завтра' : `через ${next - today} дн.`}`));
    return;
  }
  review = { queue: due, done: 0, ok: 0 };
  showCard();
}

function showCard() {
  const box = $('#review');
  box.innerHTML = '';
  if (!review.queue.length) {
    box.append(h('h2', 'font-display text-4xl', 'Сесію завершено'));
    box.append(h('p', 'mt-2 text-muted', `Повторено карток: ${review.done}, знала одразу: ${review.ok}.`));
    renderBoxes();
    return;
  }
  const id = review.queue[0];
  const w = data.byId.get(id);
  box.append(h('p', 'text-sm text-muted', `Залишилось на сьогодні: ${review.queue.length}`));
  const img = h('img', 'mx-auto mt-4 h-36 w-36');
  Object.assign(img, { src: imgSrc(w), alt: '', width: 144, height: 144 });
  box.append(img, h('p', 'mt-4 text-center text-xl', `${label(w, 'uk').w}`));
  const ans = h('div', 'mt-4 text-center');
  ans.hidden = true;
  const t = h('p', 'font-display text-5xl word-lang', display(w, lang));
  t.lang = lang;
  if (data.lang[lang].rtl) t.dir = 'rtl';
  ans.append(t);
  const l = label(w, lang);
  if (l.r) ans.append(h('p', 'text-muted', l.r));
  const show = h('button', 'btn-primary mx-auto mt-6 flex', 'Показати слово');
  show.type = 'button';
  const grade = h('div', 'mt-6 flex flex-wrap justify-center gap-3');
  grade.hidden = true;
  const no = h('button', 'btn-secondary', 'Ще не пам’ятаю');
  const yes = h('button', 'btn-primary', 'Знаю ✓');
  no.type = yes.type = 'button';
  grade.append(no, yes);
  show.addEventListener('click', () => {
    ans.hidden = false; show.hidden = true; grade.hidden = false;
    if (canSpeak) speak(l.w, data.lang[lang].voice);
    yes.focus();
  });
  const rate = (knew) => {
    const deck = getDeck(lang);
    deck[id] = reviewCard(deck[id], knew, dayNumber());
    saveDeck(lang, deck);
    review.queue.shift();
    review.done++;
    if (knew) review.ok++;
    renderBoxes();
    showCard();
  };
  no.addEventListener('click', () => rate(false));
  yes.addEventListener('click', () => rate(true));
  box.append(ans, show, grade);
  show.focus({ preventScroll: true });
}

function addNew() {
  const deck = getDeck(lang);
  const level = store.get(`thingual-web:test:${lang}`)?.level || 'A1';
  const li = LEVELS.indexOf(level);
  const fresh = shuffle(data.words.filter((w) => !deck[w.id] && label(w, lang) && Math.abs(LEVELS.indexOf(w.level) - li) <= 1));
  const pool = fresh.length >= 10 ? fresh : shuffle(data.words.filter((w) => !deck[w.id] && label(w, lang)));
  const n = addToDeck(lang, pool.slice(0, 10).map((w) => w.id));
  renderReview();
  $('#add-a1').textContent = n ? `Додано ${n} слів (рівень ~${level})` : 'Усі слова вже в картках';
  setTimeout(() => { $('#add-a1').textContent = '+ 10 нових слів'; }, 2500);
}

/* ================================== План ================================== */
function runPlan(showErrors = true) {
  const raw = Object.fromEntries(['minutes', 'days', 'target', 'known'].map((k) => [k, $('#' + k).value]));
  const v = validatePlan(raw);
  ['minutes', 'days', 'target', 'known'].forEach((k) => {
    const err = v.errors?.[k] || '';
    if (showErrors || !err) {
      $('#' + k + '-err').textContent = err;
      $('#' + k).setAttribute('aria-invalid', String(Boolean(err)));
    }
  });
  const out = $('#plan-result');
  if (v.errors) {
    if (showErrors) {
      out.innerHTML = '';
      out.append(h('p', 'text-muted', 'Виправ значення ліворуч — і план з’явиться тут.'));
      const first = ['minutes', 'days', 'target', 'known'].find((k) => v.errors[k]);
      $('#' + first).focus();
    }
    return;
  }
  store.set('thingual-web:plan', v.values);
  const p = calcPlan(v.values);
  out.innerHTML = '';
  out.append(h('p', 'eyebrow', 'Твій план'));
  const big = h('p', 'mt-2 font-display text-6xl');
  big.textContent = `${p.weeks} тиж.`;
  out.append(big);
  out.append(h('p', 'text-muted', `до ${p.finish.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })} — щоб вивчити ще ${p.left} слів`));
  const dl = h('dl', 'mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3');
  [['Нових слів за день', p.perDay], ['За тиждень', p.perWeek], ['Навчальних днів', p.studyDays]].forEach(([a, b]) => {
    const d = h('div', 'rounded-m bg-surface-alt p-4');
    d.append(h('dt', 'text-xs text-muted', a), h('dd', 'mt-1 text-2xl font-semibold tabular-nums', String(b)));
    dl.append(d);
  });
  out.append(dl);
  // Простий графік: скільки слів буде знати через кожні 25 % часу
  const chart = h('div', 'mt-6');
  chart.append(h('p', 'text-sm font-semibold', 'Як зростатиме словник'));
  const rows = h('div', 'mt-3 grid gap-2');
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const wk = Math.max(1, Math.round(p.weeks * f));
    const words = Math.min(v.values.target, v.values.known + Math.min(p.left, wk * p.perWeek));
    const r = h('div', 'grid grid-cols-[64px_1fr_56px] items-center gap-2 text-sm');
    r.append(h('span', 'text-muted', `${wk} тиж.`));
    const bar = h('span', 'h-3 rounded-full bg-surface-alt');
    const fl = h('span', 'block h-3 rounded-full bg-accent');
    fl.style.width = `${(words / v.values.target) * 100}%`;
    bar.append(fl);
    r.append(bar, h('span', 'text-right tabular-nums', String(words)));
    rows.append(r);
  });
  chart.append(rows);
  out.append(chart);
  const notes = [];
  if (p.capped) notes.push(`Часу вистачає на більше, але ми обмежили ${p.perDay} нових слів на день: решта часу піде на повторення — так слова запам’ятовуються краще.`);
  if (p.tooShort) notes.push('Менше 3 хвилин на слово — замало, тому план розраховано на 1 нове слово на день.');
  notes.push('Розрахунок: ~3 хв на нове слово (знайомство + 3–4 повторення в наступні дні).');
  notes.forEach((n) => out.append(h('p', 'mt-3 text-xs text-muted', n)));
}

/* ================================== Старт ================================== */
function fillLang() {
  const s = $('#t-lang');
  s.innerHTML = '';
  data.languages.filter((l) => l.code !== 'uk').forEach((l) => { const o = h('option', null, `${l.native} — ${l.name}`); o.value = l.code; o.selected = l.code === lang; s.append(o); });
  s.addEventListener('change', () => { lang = s.value; setLang(lang); test = null; testIntro(); renderReview(); });
}

async function init() {
  try {
    data = await loadData();
  } catch (e) {
    renderError($('#test'), e, init);
    return;
  }
  lang = getLang('de');
  if (!data.lang[lang] || lang === 'uk') lang = 'de';
  fillLang();
  initTabs();
  testIntro();
  renderReview();
  $('#add-a1').addEventListener('click', addNew);
  $('#reset-deck').addEventListener('click', () => { $('#reset-confirm').hidden = false; $('#reset-yes').focus(); });
  $('#reset-no').addEventListener('click', () => { $('#reset-confirm').hidden = true; $('#reset-deck').focus(); });
  $('#reset-yes').addEventListener('click', () => { saveDeck(lang, {}); $('#reset-confirm').hidden = true; renderReview(); });
  const saved = store.get('thingual-web:plan');
  if (saved) Object.entries(saved).forEach(([k, val]) => { if ($('#' + k)) $('#' + k).value = val; });
  $('#plan-form').addEventListener('submit', (e) => { e.preventDefault(); runPlan(true); });
  $('#plan-form').addEventListener('input', () => runPlan(false));
  runPlan(false);
}
init();
