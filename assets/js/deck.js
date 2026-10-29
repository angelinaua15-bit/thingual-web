// Особисті картки (система Лейтнера) — окремо для кожної мови, у localStorage браузера.
import { store } from './storage.js';
import { newCard, dayNumber } from './core.js';

const key = (lang) => `thingual-web:deck:${lang}`;
export const LANG_KEY = 'thingual-web:lang';

export const getLang = (fallback = 'de') => store.get(LANG_KEY, fallback);
export const setLang = (code) => store.set(LANG_KEY, code);

export const getDeck = (lang) => store.get(key(lang), {});
export const saveDeck = (lang, deck) => store.set(key(lang), deck);

export function addToDeck(lang, ids) {
  const deck = getDeck(lang);
  const today = dayNumber();
  let added = 0;
  for (const id of [].concat(ids)) if (!deck[id]) { deck[id] = newCard(today); added++; }
  saveDeck(lang, deck);
  return added;
}
export const inDeck = (lang, id) => Boolean(getDeck(lang)[id]);
