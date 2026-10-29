// Підключається синхронно в <head>: ставить клас .dark до першого малювання, щоб тема не «блимала».
(function () {
  var t = null;
  try { t = localStorage.getItem('thingual-web:theme'); } catch (e) { /* сховище недоступне */ }
  var dark = t ? t === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
})();
