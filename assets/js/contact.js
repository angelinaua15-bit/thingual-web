// Форма зворотного зв'язку: перевірка регулярними виразами (core.js), маска телефону, доступні помилки,
// honeypot і захист від подвійного натискання. Сервера немає — тому чесно показуємо, що дані нікуди не пішли,
// і пропонуємо надіслати звернення через GitHub Issues (лише тема й текст, без особистих даних в адресі).
import { validateField, formatPhone } from './core.js';

const $ = (s) => document.querySelector(s);
const form = $('#contact-form');
const FIELDS = ['name', 'email', 'phone', 'topic', 'message', 'consent'];
const DRAFT = 'thingual-web:contact-draft';
const REPO = 'https://github.com/angelinaua15-bit/thingual-web';
const touched = new Set();
let busy = false;

const value = (f) => (f === 'consent' ? $('#consent').checked : $('#' + f).value);
$('#phone').addEventListener('blur', (e) => { if (e.target.value) e.target.value = formatPhone(e.target.value); });

function check(f) {
  const msg = validateField(f, value(f));
  const input = $('#' + f);
  input.setAttribute('aria-invalid', String(Boolean(msg)));
  $(`#${f}-err`).textContent = msg;
  return !msg;
}

FIELDS.forEach((f) => {
  const el = $('#' + f);
  el.addEventListener('blur', () => { if (el.value || f === 'consent' || touched.has(f)) { touched.add(f); check(f); } });
  el.addEventListener(f === 'consent' || f === 'topic' ? 'change' : 'input', () => { if (touched.has(f)) check(f); });
});

// Маска телефону: +380 (XX) XXX-XX-XX; приймає 050…, 380…, +38 0…
$('#phone').addEventListener('input', (e) => {
  const el = e.target;
  if (e.inputType?.startsWith('delete')) return; // під час видалення маску не нав'язуємо — інакше «(» не стерти
  el.value = formatPhone(el.value);
});

// Лічильник символів і чернетка (лише тема й текст — без особистих даних, у sessionStorage)
const counter = $('#counter');
function saveDraft() {
  counter.textContent = String($('#message').value.length);
  try { sessionStorage.setItem(DRAFT, JSON.stringify({ topic: $('#topic').value, message: $('#message').value })); } catch { /* недоступно */ }
}
$('#message').addEventListener('input', saveDraft);
$('#topic').addEventListener('change', saveDraft);
try {
  const d = JSON.parse(sessionStorage.getItem(DRAFT) || 'null');
  if (d) { $('#topic').value = d.topic || ''; $('#message').value = d.message || ''; }
} catch { /* пошкоджена чернетка — ігноруємо */ }
counter.textContent = String($('#message').value.length);

function showResult() {
  const topic = $('#topic').selectedOptions[0].textContent;
  const msg = $('#message').value.trim();
  const st = $('#form-status');
  st.className = 'mt-2 rounded-m border border-ok/40 bg-ok/10 p-5';
  st.setAttribute('role', 'status');
  st.innerHTML = '';
  const t = document.createElement('p');
  t.className = 'font-semibold';
  t.textContent = 'Дані заповнено правильно.';
  const p = document.createElement('p');
  p.className = 'mt-1 text-sm';
  p.textContent = 'На сайті немає сервера, тому форма нічого не надіслала й не зберегла твої контакти. Щоб звернення дійшло, відкрий готове issue на GitHub — тему й текст уже підставлено.';
  const row = document.createElement('div');
  row.className = 'mt-4 flex flex-wrap gap-2';
  const a = document.createElement('a');
  a.className = 'btn-primary';
  a.rel = 'noopener';
  a.target = '_blank';
  a.href = `${REPO}/issues/new?title=${encodeURIComponent(`[${topic}] ${msg.slice(0, 60)}`)}&body=${encodeURIComponent(`${msg}\n\n— надіслано з форми Thingual Web`)}`;
  a.textContent = 'Відкрити issue на GitHub ↗';
  const c = document.createElement('button');
  c.type = 'button';
  c.className = 'btn-secondary';
  c.textContent = 'Скопіювати текст';
  c.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(msg); c.textContent = 'Скопійовано ✓'; } catch { c.textContent = 'Не вдалося — виділи текст вручну'; }
  });
  row.append(a, c);
  st.append(t, p, row);
  st.focus();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (busy) return;                                 // подвійне натискання
  if ($('#website').value) return;                  // honeypot: заповнюють лише боти
  FIELDS.forEach((f) => touched.add(f));
  const bad = FIELDS.filter((f) => !check(f));
  if (bad.length) { $('#' + bad[0]).focus(); return; }   // фокус на першому хибному полі
  busy = true;
  const btn = $('#send');
  btn.disabled = true;
  btn.textContent = 'Перевіряємо…';
  setTimeout(() => {
    showResult();
    try { sessionStorage.removeItem(DRAFT); } catch { /* ignore */ }
    btn.textContent = 'Перевірити й підготувати';
    btn.disabled = false;
    busy = false;
  }, 400);
});
