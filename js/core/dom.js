// Pequenos utilitários de DOM e texto.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapa texto do usuário antes de colocar em HTML. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function uid(prefix = 'id') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Cor hexadecimal válida? (protege atributos style contra valores estranhos vindos de importação) */
export const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c);
export const safeColor = (c, fallback = '#C7D0E0') => (isColor(c) ? c : fallback);
/** Classe de ícone Font Awesome válida? */
export const isIcon = (s) => typeof s === 'string' && /^fa-[a-z0-9-]+$/.test(s);
export const safeIcon = (s, fallback = 'fa-tag') => (isIcon(s) ? s : fallback);

export const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

/** Normaliza texto para busca (sem acento, minúsculo). */
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
