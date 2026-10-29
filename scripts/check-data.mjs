// CI: перевірка структури data.json і наявності ілюстрацій для кожного слова.
import { readFileSync, existsSync } from 'node:fs';
const d = JSON.parse(readFileSync('data.json', 'utf8'));
const errors = [];
const langs = new Set(d.languages.map((l) => l.code));
const topics = new Set(d.topics.map((t) => t.id));
const ids = new Set();
for (const w of d.words) {
  if (ids.has(w.id)) errors.push(`дубль id: ${w.id}`);
  ids.add(w.id);
  if (!topics.has(w.topic)) errors.push(`${w.id}: невідома тема ${w.topic}`);
  if (!d.levels.includes(w.level)) errors.push(`${w.id}: невідомий рівень ${w.level}`);
  if (!w.labels.en || !w.labels.uk) errors.push(`${w.id}: немає en або uk`);
  for (const k of Object.keys(w.labels)) if (!langs.has(k)) errors.push(`${w.id}: невідома мова ${k}`);
  if (!existsSync(`assets/img/emoji/${w.img}.webp`)) errors.push(`${w.id}: немає ілюстрації ${w.img}.webp`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`data.json OK: ${d.words.length} слів, ${langs.size} мов, ${topics.size} тем`);
