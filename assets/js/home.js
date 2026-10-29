// Головна: статистика зі словника, «слово дня» і карусель «Як це звучить у світі» (Swiper через CDN).
import { loadData, imgSrc, renderError } from './data.js';
import { dailyIndex, label, display } from './core.js';
import { speak, canSpeak } from './speech.js';
import { getLang, setLang, addToDeck, inDeck } from './deck.js';
import { LIBS, loadScript, loadStyle, whenNear } from './cdn.js';

const $ = (s, el = document) => el.querySelector(s);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

let data, word, swiper;

function langOptions(select, current) {
  select.innerHTML = '';
  for (const l of data.languages) {
    if (l.code === 'uk') continue;
    const o = h('option', null, `${l.native} — ${l.name}`);
    o.value = l.code;
    o.selected = l.code === current;
    select.append(o);
  }
}

function speakBtn(text, lang, slow, note) {
  const b = h('button', slow ? 'btn-secondary min-h-[44px] px-4' : 'btn-primary min-h-[44px] px-4');
  b.type = 'button';
  if (!slow) { const i = h('span', null, '▶'); i.setAttribute('aria-hidden', 'true'); b.append(i, ' '); }
  b.append(slow ? 'Повільно' : 'Послухати');
  b.addEventListener('click', () => {
    if (!speak(text, data.lang[lang].voice, { slow })) note.hidden = false;
  });
  return b;
}

function renderDrop(lang) {
  const box = $('#drop');
  box.innerHTML = '';
  const l = label(word, lang);
  const meta = data.lang[lang];

  // Ліва картка — саме слово
  const card = h('article', 'card flex flex-col p-6 sm:p-8');
  const top = h('div', 'flex items-start justify-between gap-4');
  const img = h('img', 'h-28 w-28 sm:h-36 sm:w-36');
  Object.assign(img, { src: imgSrc(word), alt: label(word, 'uk')?.w || word.id, width: 144, height: 144 });
  const chips = h('div', 'flex flex-wrap justify-end gap-2');
  chips.append(h('span', 'rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold', word.level), h('span', 'rounded-full bg-surface-alt px-3 py-1 text-xs', data.topicName[word.topic]));
  top.append(img, chips);
  const w = h('p', 'mt-6 font-display text-5xl leading-tight sm:text-6xl word-lang', display(word, lang));
  w.lang = lang;
  if (meta.rtl) w.dir = 'rtl';
  card.append(top, w);
  if (l.r) card.append(h('p', 'mt-1 text-muted', l.r));
  card.append(h('p', 'mt-2 text-sm text-muted', `${label(word, 'uk').w} · ${label(word, 'en').w} ${word.ipa}`));
  const actions = h('div', 'mt-auto flex flex-wrap items-center gap-2 pt-6');
  const note = h('p', 'w-full text-xs text-muted', 'Браузер не має голосу для цієї мови.');
  note.hidden = true;
  if (canSpeak) actions.append(speakBtn(l.w, lang, false, note), speakBtn(l.w, lang, true, note));
  const add = h('button', 'btn-secondary min-h-[44px] px-4');
  add.type = 'button';
  const setAdd = () => {
    const has = inDeck(lang, word.id);
    add.textContent = has ? '✓ У моїх картках' : '+ У мої картки';
    add.disabled = has;
  };
  add.addEventListener('click', () => { addToDeck(lang, word.id); setAdd(); });
  setAdd();
  actions.append(add, note);
  card.append(actions);
  if (word.ex?.en) {
    const ex = h('p', 'mt-5 border-t border-line pt-4 text-sm', word.ex.en);
    ex.lang = 'en';
    card.append(ex);
    if (word.ex.uk) card.append(h('p', 'text-sm text-muted', word.ex.uk));
  }

  // Права частина — карусель «як звучить у світі»
  const world = h('div', 'card min-w-0 p-6 sm:p-8');
  world.append(h('h3', 'text-lg font-semibold', 'Як це звучить у світі'), h('p', 'mt-1 text-sm text-muted', 'Гортай стрілками, свайпом або клавішами ← →.'));
  const sw = h('div', 'swiper mt-5');
  sw.setAttribute('aria-label', 'Слово дня різними мовами');
  const wrap = h('div', 'swiper-wrapper');
  for (const lg of data.languages) {
    const ll = label(word, lg.code);
    if (!ll) continue;
    const s = h('div', 'swiper-slide !h-auto');
    const inner = h('div', 'flex h-full flex-col rounded-m border border-line bg-bg p-5');
    inner.append(h('p', 'eyebrow', lg.name));
    const t = h('p', 'mt-3 font-display text-4xl leading-tight word-lang', display(word, lg.code));
    t.lang = lg.code;
    if (lg.rtl) t.dir = 'rtl';
    inner.append(t);
    inner.append(h('p', 'mt-1 min-h-[1.5rem] text-sm text-muted', ll.r || lg.native));
    if (canSpeak) {
      const b = h('button', 'mt-auto self-start rounded-full pt-4 text-sm font-semibold text-accent hover:underline', 'Вимовити');
      b.type = 'button';
      b.setAttribute('aria-label', `Вимовити — ${lg.name}: ${ll.w}`);
      b.addEventListener('click', () => speak(ll.w, lg.voice));
      inner.append(b);
    }
    s.append(inner);
    wrap.append(s);
  }
  const nav = h('div', 'mt-4 flex items-center gap-2');
  const prev = h('button', 'swiper-prev inline-flex h-11 w-11 items-center justify-center rounded-full border border-line hover:border-accent', '←');
  const next = h('button', 'swiper-next inline-flex h-11 w-11 items-center justify-center rounded-full border border-line hover:border-accent', '→');
  prev.type = next.type = 'button';
  prev.setAttribute('aria-label', 'Попередня мова');
  next.setAttribute('aria-label', 'Наступна мова');
  const pag = h('div', 'swiper-pag ml-auto text-sm text-muted tabular-nums');
  nav.append(prev, next, pag);
  sw.append(wrap);
  world.append(sw, nav);
  box.append(card, world);

  // Swiper вантажиться з CDN лише коли блок біля екрана; без нього слайди просто гортаються горизонтально.
  sw.classList.add('overflow-x-auto');
  whenNear(sw, async () => {
    try {
      await Promise.all([loadStyle(LIBS.swiperCss), loadScript(LIBS.swiperJs)]);
      swiper?.destroy?.();
      sw.classList.remove('overflow-x-auto');
      swiper = new window.Swiper(sw, {
        slidesPerView: 1.15, spaceBetween: 12, keyboard: { enabled: true, onlyInViewport: true },
        navigation: { prevEl: prev, nextEl: next }, pagination: { el: pag, type: 'fraction' },
        a11y: { prevSlideMessage: 'Попередня мова', nextSlideMessage: 'Наступна мова', slideLabelMessage: '{{index}} з {{slidesLength}}' },
        breakpoints: { 640: { slidesPerView: 2.2 }, 1024: { slidesPerView: 2.4 } },
      });
      const cur = [...wrap.children].findIndex((s) => s.querySelector(`[lang="${lang}"]`));
      if (cur > 0) swiper.slideTo(cur, 0);
    } catch {
      prev.hidden = next.hidden = true; // CDN недоступний — лишається звичайна горизонтальна прокрутка
    }
  });
}

async function init() {
  try {
    data = await loadData();
  } catch (e) {
    renderError($('#drop'), e, init);
    return;
  }
  $('[data-stat="words"]').textContent = data.words.length;
  $('[data-stat="langs"]').textContent = data.languages.length;
  $('[data-stat="topics"]').textContent = data.topics.length;
  word = data.words[dailyIndex(data.words.length)];
  const select = $('#drop-lang');
  let lang = getLang('de');
  if (!data.lang[lang] || lang === 'uk') lang = 'de';
  langOptions(select, lang);
  select.onchange = () => { setLang(select.value); renderDrop(select.value); };
  renderDrop(lang);
}
init();
