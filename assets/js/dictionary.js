// Словник: фільтрація (пошук будь-якою мовою, тема, рівень), сортування, «Показати ще», модальне вікно слова.
// Стан фільтрів зберігається в адресі (?q=&lang=&topic=&level=&w=), тож посиланням можна поділитися.
import { loadData, imgSrc, renderError } from './data.js';
import { filterWords, sortWords, label, display } from './core.js';
import { speak, canSpeak } from './speech.js';
import { getLang, setLang, addToDeck, inDeck } from './deck.js';

const $ = (s, el = document) => el.querySelector(s);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const PAGE = 20;

let data;
let state = { q: '', lang: 'de', topic: 'all', level: 'all', sort: 'topic' };
let shown = PAGE;
let list = [];
let lastFocus = null;

function readUrl() {
  const p = new URLSearchParams(location.search);
  const lang = p.get('lang');
  state = {
    q: (p.get('q') || '').slice(0, 40),
    lang: lang && data.lang[lang] && lang !== 'uk' ? lang : getLang('de'),
    topic: data.topicName[p.get('topic')] ? p.get('topic') : 'all',
    level: data.levels.includes(p.get('level')) ? p.get('level') : 'all',
    sort: ['topic', 'alpha', 'level'].includes(p.get('sort')) ? p.get('sort') : 'topic',
  };
  return p.get('w');
}

function writeUrl(wordId) {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  p.set('lang', state.lang);
  if (state.topic !== 'all') p.set('topic', state.topic);
  if (state.level !== 'all') p.set('level', state.level);
  if (state.sort !== 'topic') p.set('sort', state.sort);
  if (wordId) p.set('w', wordId);
  history.replaceState(null, '', '?' + p.toString());
}

function syncForm() {
  $('#q').value = state.q;
  $('#lang').value = state.lang;
  $('#topic').value = state.topic;
  $('#sort').value = state.sort;
  document.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === state.level)));
  $('#reset').hidden = !(state.q || state.topic !== 'all' || state.level !== 'all');
}

function card(w) {
  const li = h('li');
  const b = h('button', 'card group flex h-full w-full flex-col items-center p-4 text-center transition hover:-translate-y-0.5 hover:border-accent');
  b.type = 'button';
  b.dataset.id = w.id;
  const img = h('img', 'h-20 w-20 transition group-hover:scale-105');
  Object.assign(img, { src: imgSrc(w), alt: '', width: 80, height: 80, loading: 'lazy', decoding: 'async' });
  const word = h('span', 'mt-3 font-display text-2xl leading-tight word-lang', display(w, state.lang));
  word.lang = state.lang;
  if (data.lang[state.lang].rtl) word.dir = 'rtl';
  const uk = h('span', 'mt-1 text-sm text-muted', label(w, 'uk')?.w || '');
  const lvl = h('span', 'mt-3 rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-semibold', w.level);
  b.append(img, word, uk, lvl);
  li.append(b);
  return li;
}

function render() {
  list = sortWords(filterWords(data.words, state), state.sort, state.lang);
  const grid = $('#grid');
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.slice(0, shown).forEach((w) => frag.append(card(w)));
  grid.append(frag);
  const n = list.length;
  $('#count').textContent = n ? `Знайдено слів: ${n}${n > shown ? ` · показано ${Math.min(shown, n)}` : ''}` : 'Нічого не знайдено';
  $('#empty').hidden = n > 0;
  $('#more').hidden = n <= shown;
  syncForm();
}

function update(patch) {
  Object.assign(state, { q: $('#q').value.trim().slice(0, 40) }, patch); // пошук завжди береться з поля — без «застарілого» стану
  shown = PAGE;
  if (patch.lang) setLang(patch.lang);
  writeUrl();
  render();
}

/* ------------------------------ Модальне вікно ------------------------------ */
function openWord(id) {
  const w = data.byId.get(id);
  if (!w) return;
  const dlg = $('#word-dialog');
  const body = $('#wd-body');
  body.innerHTML = '';
  const lang = state.lang;
  const l = label(w, lang);

  const head = h('div', 'flex items-start gap-5');
  const img = h('img', 'h-24 w-24 shrink-0 sm:h-28 sm:w-28');
  Object.assign(img, { src: imgSrc(w), alt: label(w, 'uk').w, width: 112, height: 112 });
  const tb = h('div', 'min-w-0 flex-1');
  tb.append(h('p', 'eyebrow', `${data.topicName[w.topic]} · ${w.level}`));
  const title = h('h2', 'mt-1 font-display text-5xl leading-tight word-lang', display(w, lang));
  title.id = 'wd-title';
  title.lang = lang;
  if (data.lang[lang].rtl) title.dir = 'rtl';
  tb.append(title);
  if (l.r) tb.append(h('p', 'text-muted', l.r));
  tb.append(h('p', 'mt-1 text-sm text-muted', `${label(w, 'uk').w} · ${label(w, 'en').w} ${w.ipa}`));
  const close = h('button', 'ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl hover:bg-surface-alt', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Закрити');
  close.addEventListener('click', () => dlg.close());
  head.append(img, tb, close);
  body.append(head);

  const actions = h('div', 'mt-5 flex flex-wrap gap-2');
  const note = h('p', 'w-full text-xs text-muted', 'У цьому браузері немає голосу для цієї мови.');
  note.hidden = true;
  if (canSpeak) {
    for (const slow of [false, true]) {
      const b = h('button', slow ? 'btn-secondary min-h-[44px] px-4' : 'btn-primary min-h-[44px] px-4', slow ? 'Повільно' : 'Послухати');
      b.type = 'button';
      b.addEventListener('click', () => { if (!speak(l.w, data.lang[lang].voice, { slow })) note.hidden = false; });
      actions.append(b);
    }
  }
  const add = h('button', 'btn-secondary min-h-[44px] px-4');
  add.type = 'button';
  const setAdd = () => { const has = inDeck(lang, w.id); add.textContent = has ? '✓ У моїх картках' : '+ У мої картки'; add.disabled = has; };
  add.addEventListener('click', () => { addToDeck(lang, w.id); setAdd(); });
  setAdd();
  actions.append(add, note);
  body.append(actions);

  if (w.ex?.en) {
    const ex = h('div', 'mt-6 rounded-m bg-surface-alt p-4');
    const e1 = h('p', null, w.ex.en);
    e1.lang = 'en';
    ex.append(e1);
    if (w.ex.uk) ex.append(h('p', 'mt-1 text-sm text-muted', w.ex.uk));
    body.append(ex);
  }

  body.append(h('h3', 'mt-6 text-sm font-semibold', 'Усі 16 мов'));
  const table = h('dl', 'mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2');
  for (const lg of data.languages) {
    const ll = label(w, lg.code);
    if (!ll) continue;
    const row = h('div', 'flex items-baseline justify-between gap-3 border-b border-line py-2');
    row.append(h('dt', 'text-sm text-muted', lg.name));
    const dd = h('dd', 'text-right word-lang', display(w, lg.code) + (ll.r ? ` (${ll.r})` : ''));
    dd.lang = lg.code;
    if (lg.rtl) dd.dir = 'rtl';
    row.append(dd);
    table.append(row);
  }
  body.append(table);

  const rel = (w.rel || []).map((r) => data.byId.get(r)).filter(Boolean);
  if (rel.length) {
    body.append(h('h3', 'mt-6 text-sm font-semibold', 'Пов’язані слова'));
    const rl = h('div', 'mt-2 flex flex-wrap gap-2');
    rel.forEach((r) => {
      const b = h('button', 'chip', display(r, lang) || r.id);
      b.type = 'button';
      b.addEventListener('click', () => openWord(r.id));
      rl.append(b);
    });
    body.append(rl);
  }
  writeUrl(id);
  if (!dlg.open) { lastFocus = document.activeElement; dlg.showModal(); }
  close.focus();
}

function bind() {
  const form = $('#filters');
  form.addEventListener('submit', (e) => e.preventDefault());
  let t;
  $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => update({ q: e.target.value.trim().slice(0, 40) }), 150); });
  $('#lang').addEventListener('change', (e) => update({ lang: e.target.value }));
  $('#topic').addEventListener('change', (e) => update({ topic: e.target.value }));
  $('#sort').addEventListener('change', (e) => update({ sort: e.target.value }));
  document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => update({ level: b.dataset.level })));
  $('#reset').addEventListener('click', () => update({ q: '', topic: 'all', level: 'all' }));
  $('#more').addEventListener('click', () => {
    const first = shown;
    shown += PAGE;
    render();
    $('#grid').children[first]?.querySelector('button')?.focus();
  });
  $('#grid').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) openWord(b.dataset.id); });
  const dlg = $('#word-dialog');
  dlg.addEventListener('close', () => { writeUrl(); lastFocus?.focus?.(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // клік по затемненню
}

function fillSelects() {
  const ls = $('#lang');
  ls.innerHTML = '';
  data.languages.filter((l) => l.code !== 'uk').forEach((l) => { const o = h('option', null, `${l.native} — ${l.name}`); o.value = l.code; ls.append(o); });
  const ts = $('#topic');
  data.topics.forEach((tp) => { const o = h('option', null, tp.name); o.value = tp.id; ts.append(o); });
}

async function init() {
  try {
    data = await loadData();
  } catch (e) {
    $('#count').textContent = '';
    renderError($('#grid'), e, init);
    return;
  }
  fillSelects();
  const open = readUrl();
  bind();
  render();
  if (open) openWord(open);
}
init();
