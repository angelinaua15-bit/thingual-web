# Thingual Web

Вебкомпаньйон мовного застосунку [Thingual](https://thingual.vercel.app): словник предметів шістнадцятьма мовами, «слово дня», адаптивний тест рівня, картки за системою Лейтнера і калькулятор плану навчання. Працює без реєстрації й без сервера.

**Сайт:** https://thingual-web.vercel.app
**Код застосунку:** https://github.com/angelinaua15-bit/thingual

Самостійна робота з дисципліни «Технології веброзробки та дизайну», НУ «Львівська політехніка». Автор: Ангеліна Іванів, ПП-25.

## Сторінки

| Сторінка | Що робить |
|---|---|
| `index.html` — Головна | Пояснення ідеї, «слово дня» (Daily Drop) з вимовою, карусель «Як це звучить у світі» (Swiper), як працює застосунок |
| `dictionary.html` — Словник | 220 слів, пошук будь-якою з 16 мов і романізацією, фільтри за темою та рівнем CEFR, сортування, модальне вікно з усіма перекладами, стан фільтрів у адресі |
| `trainer.html` — Тренажер | Адаптивний тест рівня (12 питань), картки Лейтнера (5 коробок, окремо для кожної мови), калькулятор плану |
| `about.html` — Про Thingual | Можливості застосунку, порівняння з сайтом, обмеження, FAQ, ліцензії |
| `contact.html` — Контакти | Форма зворотного зв'язку з перевіркою RegEx і маскою телефону; звернення через GitHub Issues |

## Технології

- **HTML5** — семантична розмітка (`header`, `nav`, `main`, `section`, `dialog`, `details`), валідація `html-validate`.
- **Tailwind CSS 3.4** — зібраний CLI у `assets/css/styles.css`; кольори з дизайн-системи застосунку як CSS-змінні, темна тема класом `.dark`.
- **JavaScript (ES-модулі)** без фреймворків: `fetch` + `async/await` для `data.json`, `localStorage` для теми, карток і результатів.
- **CDN (jsDelivr, SRI):** [Swiper 11](https://swiperjs.com) — карусель, [canvas-confetti](https://github.com/catdad/canvas-confetti) — святкування результату. Завантажуються ліниво.
- **Web Speech API** — вимова слів голосом браузера.
- **Vercel** (хостинг, заголовки безпеки з `vercel.json`) і **GitHub Actions** (перевірки + Lighthouse CI).

## Структура

```
├── index.html, dictionary.html, trainer.html, about.html, contact.html, 404.html
├── data.json                 # 220 слів × 16 мов, теми, рівні (з словника застосунку)
├── assets/
│   ├── css/styles.css        # зібраний Tailwind (не редагувати вручну)
│   ├── js/
│   │   ├── core.js           # чисті функції: фільтри, тест рівня, Лейтнер, план, RegEx форми
│   │   ├── data.js           # завантаження data.json з обробкою помилок
│   │   ├── common.js         # тема, мобільне меню
│   │   ├── home.js, dictionary.js, trainer.js, contact.js
│   │   ├── deck.js, storage.js, speech.js, cdn.js, theme-init.js
│   ├── fonts/                # Inter, Instrument Serif, Cormorant Garamond (OFL)
│   └── img/                  # логотип, Земля, 3D-ілюстрації Fluent Emoji
├── src/input.css             # вхідний файл Tailwind
├── tests/core.test.js        # 15 автотестів (node --test)
├── scripts/check-data.mjs    # перевірка data.json у CI
├── .github/workflows/ci.yml  # CI: якість + Lighthouse
├── tailwind.config.js, lighthouserc.json, vercel.json, robots.txt, sitemap.xml, site.webmanifest
```

## Запуск локально

```bash
npm install
npm run build:css      # або npm run watch:css під час роботи
npm run serve          # http://localhost:3000
npm test               # автотести логіки
npm run validate:html  # перевірка HTML
```

`data.json` завантажується через `fetch`, тому сторінки треба відкривати через локальний сервер, а не подвійним кліком по файлу.

## CI/CD

Кожен `push` і pull request у `main` запускає `.github/workflows/ci.yml`:

1. **Якість коду:** перезбірка Tailwind і перевірка, що `styles.css` закомічено актуальним; `node --check` для всіх скриптів; автотести; перевірка `data.json`; валідація HTML.
2. **Lighthouse CI:** 5 сторінок, пороги 0.9 для доступності, найкращих практик і SEO; звіти — артефакт запуску.

Публікацію виконує Git-інтеграція Vercel: кожен коміт у `main` автоматично стає production-версією на `thingual-web.vercel.app`, pull request — preview-версією.

## Ліцензії

- Код — MIT.
- Ілюстрації — [Fluent Emoji](https://github.com/microsoft/fluentui-emoji), Microsoft, MIT.
- Шрифти — SIL Open Font License (файли ліцензій у `assets/fonts/`).
- Слова й переклади — зі словника застосунку Thingual того самого автора.
