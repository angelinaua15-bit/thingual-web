// Автотести чистих функцій (node --test). Запуск: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/core.js';

const data = JSON.parse(readFileSync(new URL('../data.json', import.meta.url)));
const W = data.words;

test('parseIntStrict: порожнє, текст, дробові, від’ємні', () => {
  assert.equal(C.parseIntStrict(''), null);
  assert.equal(C.parseIntStrict('abc'), null);
  assert.equal(C.parseIntStrict('2.5'), null);
  assert.equal(C.parseIntStrict('2,5'), null);
  assert.equal(C.parseIntStrict('1e3'), null);
  assert.equal(C.parseIntStrict(' 15 '), 15);
  assert.equal(C.parseIntStrict('-3'), -3);
});

test('label/display: артикль, романізація, апостроф', () => {
  const soup = W.find((w) => w.id === 'soup');
  assert.equal(C.display(soup, 'de'), 'die Suppe');
  assert.equal(C.label(soup, 'ja').r, 'sūpu');
  assert.equal(C.label(soup, 'xx'), null);
  assert.equal(C.display({ labels: { fr: ['orange', 'l’', ''] } }, 'fr'), 'l’orange');
});

test('filterWords: пошук будь-якою мовою і романізацією, фільтри', () => {
  assert.ok(C.filterWords(W, { q: 'суп', lang: 'de' }).some((w) => w.id === 'soup'));
  assert.ok(C.filterWords(W, { q: 'SUPPE', lang: 'de' }).some((w) => w.id === 'soup'));
  assert.ok(C.filterWords(W, { q: 'supu', lang: 'ja' }).some((w) => w.id === 'soup'));
  const a = C.filterWords(W, { topic: 'animals', level: 'A1', lang: 'de' });
  assert.ok(a.length > 0 && a.every((w) => w.topic === 'animals' && w.level === 'A1'));
  assert.equal(C.filterWords(W, { q: 'zzzzzz', lang: 'de' }).length, 0);
});

test('dailyIndex: стабільний протягом доби, в межах масиву', () => {
  const d1 = new Date(2026, 9, 29, 0, 5), d2 = new Date(2026, 9, 29, 23, 55);
  assert.equal(C.dailyIndex(W.length, d1), C.dailyIndex(W.length, d2));
  for (let i = 0; i < 60; i++) {
    const k = C.dailyIndex(W.length, new Date(2026, 0, 1 + i));
    assert.ok(k >= 0 && k < W.length);
  }
  assert.equal(C.dailyIndex(0), -1);
});

test('buildOptions: 4 унікальні варіанти, серед них правильний', () => {
  const r = C.rng(42);
  for (const w of W.slice(0, 60)) {
    const o = C.buildOptions(w, W, 'de', r);
    assert.equal(o.length, 4);
    assert.equal(new Set(o.map(C.norm)).size, 4);
    assert.ok(o.includes(C.display(w, 'de')));
  }
});

test('pickWord: без повторів і з переходом на сусідній рівень', () => {
  const used = new Set();
  for (let i = 0; i < 12; i++) {
    const w = C.pickWord(W, 'de', 5, used, C.rng(i));
    assert.ok(w && !used.has(w.id));
    used.add(w.id);
  }
});

test('nextLevelIndex: межі A1…C2', () => {
  assert.equal(C.nextLevelIndex(0, false), 0);
  assert.equal(C.nextLevelIndex(5, true), 5);
  assert.equal(C.nextLevelIndex(2, true), 3);
});

test('estimateLevel: 90 % на легких питаннях — не C2 (помилка з відповіді ШІ)', () => {
  const easy = Array.from({ length: 10 }, (_, i) => ({ level: i < 6 ? 'A1' : 'A2', correct: i !== 3 }));
  assert.equal(C.estimateLevel(easy).level, 'A2');
  const strong = [['A1', 1], ['A2', 1], ['B1', 1], ['B2', 1], ['C1', 1], ['C1', 1], ['C2', 0], ['C1', 1], ['C2', 1], ['C2', 0]].map(([level, ok]) => ({ level, correct: !!ok }));
  assert.equal(C.estimateLevel(strong).level, 'C1');
  assert.equal(C.estimateLevel([]).level, 'A1');
});

test('Лейтнер: правильна → наступна коробка, помилка → коробка 0', () => {
  let c = C.newCard(100);
  c = C.reviewCard(c, true, 100); assert.deepEqual([c.box, c.due], [1, 101]);
  c = C.reviewCard(c, true, 101); assert.deepEqual([c.box, c.due], [2, 104]);
  c = C.reviewCard(c, false, 104); assert.deepEqual([c.box, c.due], [0, 104]);
  let top = { box: 4, due: 0 };
  top = C.reviewCard(top, true, 10); assert.deepEqual([top.box, top.due], [4, 24]);
  assert.deepEqual(C.dueIds({ a: { box: 0, due: 5 }, b: { box: 1, due: 9 } }, 5), ['a']);
});

test('validatePlan: межі та некоректний ввід', () => {
  assert.ok(C.validatePlan({ minutes: '0', days: '5', target: '100' }).errors.minutes);
  assert.ok(C.validatePlan({ minutes: '15', days: '8', target: '100' }).errors.days);
  assert.ok(C.validatePlan({ minutes: '1.5', days: '5', target: '100' }).errors.minutes);
  assert.ok(C.validatePlan({ minutes: '15', days: '5', target: '100', known: '100' }).errors.known);
  assert.deepEqual(C.validatePlan({ minutes: '15', days: '5', target: '100', known: '' }).values, { minutes: 15, days: 5, target: 100, known: 0 });
});

test('calcPlan: тижні рахуються від навчальних днів (помилка з відповіді ШІ)', () => {
  const p = C.calcPlan({ minutes: 5, days: 1, target: 100, known: 0 });
  assert.equal(p.perDay, 1);
  assert.equal(p.weeks, 100);  // 1 слово × 1 день на тиждень = 100 тижнів, а не 15
  const q = C.calcPlan({ minutes: 20, days: 5, target: 500, known: 100 });
  assert.deepEqual([q.perDay, q.studyDays, q.weeks], [6, 67, 14]);
  assert.ok(C.calcPlan({ minutes: 120, days: 7, target: 2000 }).capped);
});

test('Форма: ім’я', () => {
  for (const ok of ['Ангеліна', 'Ivan', 'O’Connor', "D'Arc", 'Анна-Марія', 'Mary Jane', 'Ґанна', 'Їжак']) assert.equal(C.validateField('name', ok), '', ok);
  for (const bad of ['', 'I', 'John2', '---', '  ', 'Анна--Марія', '-Ivan', 'Ыэъ', 'x'.repeat(41)]) assert.notEqual(C.validateField('name', bad), '', bad);
});

test('Форма: email', () => {
  for (const ok of ['test@example.com', 'user.name+tag@gmail.com', 'a@lpnu.ua']) assert.equal(C.validateField('email', ok), '', ok);
  for (const bad of ['', 'test@', 'test@@example.com', 'example.com', 'a b@x.com', 'a@x', 'a@x.c']) assert.notEqual(C.validateField('email', bad), '', bad);
});

test('Форма: маска і перевірка телефону', () => {
  assert.equal(C.formatPhone('0501234567'), '+380 (50) 123-45-67');
  assert.equal(C.formatPhone('380671234567'), '+380 (67) 123-45-67');
  assert.equal(C.formatPhone('+38'), '+38');
  // посимвольне введення, як у полі: «+38 (067)…» не має перетворитися на код «38»
  let v = '';
  for (const ch of '+38 (067) 123-45-67') v = C.formatPhone(v + ch);
  assert.equal(v, '+380 (67) 123-45-67');
  assert.equal(C.validateField('phone', ''), '');
  assert.equal(C.validateField('phone', '+380 (50) 123-45-67'), '');
  assert.notEqual(C.validateField('phone', '+380 (12) 345-67-89'), '');
  assert.notEqual(C.validateField('phone', '+380 (50) 123-45'), '');
});

test('Форма: повідомлення, тема, згода', () => {
  assert.notEqual(C.validateField('message', 'коротко'), '');
  assert.equal(C.validateField('message', 'Достатньо довге повідомлення'), '');
  assert.notEqual(C.validateField('message', 'x'.repeat(1001)), '');
  assert.notEqual(C.validateField('topic', ''), '');
  assert.notEqual(C.validateField('consent', false), '');
});
