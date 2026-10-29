// Безпечна робота з localStorage: у приватному режимі чи з вимкненими cookies доступ кидає виняток.
const memory = new Map();
export const store = {
  available: (() => {
    try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch { return false; }
  })(),
  get(key, fallback = null) {
    try {
      const raw = this.available ? localStorage.getItem(key) : memory.get(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    const raw = JSON.stringify(value);
    try { if (this.available) localStorage.setItem(key, raw); else memory.set(key, raw); } catch { memory.set(key, raw); }
  },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } memory.delete(key); },
};
