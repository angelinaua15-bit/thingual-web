// Озвучення слова через Web Speech API браузера. Якщо голосу для мови немає — повертаємо false.
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text, bcp47, { slow = false } = {}) {
  if (!canSpeak || !text) return false;
  const voices = speechSynthesis.getVoices();
  const base = bcp47.split('-')[0];
  const voice = voices.find((v) => v.lang === bcp47) || voices.find((v) => v.lang.startsWith(base));
  if (voices.length && !voice) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = bcp47;
  if (voice) u.voice = voice;
  u.rate = slow ? 0.6 : 0.95;
  speechSynthesis.speak(u);
  return true;
}
