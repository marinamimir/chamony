// Armazenamento local versionado: chave única `chamony.data.v1`, campo `schema` com migrações.
// Regra de ouro: nunca perder dados. Antes de migrar ou substituir, guardamos uma cópia.

import { uid, isColor, isIcon, clampInt } from './core/dom.js';
import { isISO, isYM } from './core/dates.js';

export const KEY = 'chamony.data.v1';
export const PREV_KEY = 'chamony.data.v1.anterior'; // cópia automática antes de importar/restaurar
export const SCHEMA = 1;

export const CAT_COLORS = ['#F9C5D1', '#FFD9B8', '#FFF0B3', '#CDEBC5', '#BFE3D0', '#BCD7F5', '#D6D0F5', '#E4D4F4', '#F5D0E8', '#D9D9E3'];
export const ACCENT_COLORS = ['#F4A7B9', '#B9A6EE', '#8EC5F0', '#8FD3B6', '#F5CF7A', '#F4A08A', '#7484A0', '#A3B79A', '#E7A8D8', '#A7B0C2'];
export const CAT_ICONS = ['fa-cart-shopping', 'fa-utensils', 'fa-mug-hot', 'fa-bus', 'fa-car', 'fa-house', 'fa-heart-pulse', 'fa-pills', 'fa-graduation-cap', 'fa-gift',
  'fa-shirt', 'fa-gamepad', 'fa-film', 'fa-music', 'fa-paw', 'fa-bag-shopping', 'fa-bolt', 'fa-piggy-bank', 'fa-plane', 'fa-coins',
  'fa-wifi', 'fa-mobile-screen', 'fa-dumbbell', 'fa-spa', 'fa-baby', 'fa-book', 'fa-gas-pump', 'fa-seedling', 'fa-scissors', 'fa-receipt'];
export const BANK_ICONS = ['fa-building-columns', 'fa-piggy-bank', 'fa-vault', 'fa-wallet', 'fa-coins', 'fa-seedling', 'fa-star', 'fa-heart'];

export const DEFAULT_SETTINGS = {
  palette: 'A',          // 'A' (AeroSync) | 'B' (manteiga/sálvia/creme)
  customAccent: null,    // cor de destaque personalizada (motor de temas)
  dark: 'system',        // 'system' | 'light' | 'dark'
  layout: 'full',        // 'full' (painel completo) | 'airy' (tela respirada)
  tone: 'warm',          // 'warm' | 'neutral' | 'playful'
  hideOnOpen: false,     // abrir com valores escondidos
  splash: true,          // animação de abertura
  dueWarnDays: 5,        // avisar vencimentos de cartão com N dias de antecedência
};

export function defaults() {
  return {
    schema: SCHEMA,
    createdAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    budget: { monthlyLimit: 0 },
    salary: { base: 0, usable: true, overrides: {} },
    incomes: [],
    banks: [
      { id: 'b1', name: 'Conta principal', balance: 0, color: '#BCD7F5', icon: 'fa-building-columns', usable: true },
      { id: 'b2', name: 'Reserva', balance: 0, color: '#CDEBC5', icon: 'fa-piggy-bank', usable: false },
    ],
    cards: [],
    categories: [
      ['Mercado', 'fa-cart-shopping', 3], ['Alimentação', 'fa-utensils', 0], ['Transporte', 'fa-bus', 5],
      ['Casa', 'fa-house', 1], ['Contas fixas', 'fa-bolt', 2], ['Saúde', 'fa-heart-pulse', 8],
      ['Lazer', 'fa-gamepad', 6], ['Compras', 'fa-bag-shopping', 7], ['Pets', 'fa-paw', 4],
    ].map(([name, icon, c], i) => ({ id: 'c' + (i + 1), name, icon, color: CAT_COLORS[c] })),
    expenses: [],
    trash: [],
    bills: [],      // contas com lembrete (o "recurring" do AeroSync): { id, name, amount, day, warnDays }
    simItems: [],
    meta: { importedFrom: [] },
  };
}

// ---------------------------------------------------------------------------
// Normalização: aceita dados parcialmente corrompidos sem quebrar o app.
// ---------------------------------------------------------------------------
const int = (v, d = 0) => (Number.isFinite(v) ? Math.round(v) : d);
const str = (v, max = 120, d = '') => (typeof v === 'string' ? v.slice(0, max) : d);
const arr = (v) => (Array.isArray(v) ? v : []);
const col = (c, d) => (isColor(c) ? c : d);
const ico = (i, d) => (isIcon(i) ? i : d);

export function normalizeExpense(e) {
  if (!e || typeof e !== 'object') return null;
  const purchaseDate = isISO(e.purchaseDate) ? e.purchaseDate : null;
  if (!purchaseDate || !Number.isFinite(e.amount)) return null;
  const instTotal = clampInt(e.instTotal, 1, 120, 1);
  return {
    id: str(e.id, 80) || uid('e'),
    groupId: str(e.groupId, 80) || str(e.id, 80),
    desc: str(e.desc, 140, 'Compra'),
    amount: int(e.amount),
    purchaseDate,
    time: /^\d{2}:\d{2}$/.test(e.time) ? e.time : '12:00',
    cardId: str(e.cardId, 80) || 'pix',
    catId: str(e.catId, 80),
    catSnap: e.catSnap && typeof e.catSnap === 'object'
      ? { name: str(e.catSnap.name, 40), color: col(e.catSnap.color, '#D9D9E3'), icon: ico(e.catSnap.icon, 'fa-tag') }
      : null,
    instIndex: clampInt(e.instIndex, 1, instTotal, 1),
    instTotal,
    recurring: !!e.recurring,
    note: str(e.note, 500),
    createdAt: str(e.createdAt, 40) || new Date().toISOString(),
    ...(e.deletedAt ? { deletedAt: str(e.deletedAt, 40) } : {}),
    ...(e.source ? { source: str(e.source, 40) } : {}),
  };
}

export function normalize(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const out = {
    schema: SCHEMA,
    createdAt: str(raw.createdAt, 40) || d.createdAt,
    settings: {
      palette: ['A', 'B'].includes(s.palette) ? s.palette : 'A',
      customAccent: isColor(s.customAccent) ? s.customAccent : null,
      dark: ['system', 'light', 'dark'].includes(s.dark) ? s.dark : 'system',
      layout: ['full', 'airy'].includes(s.layout) ? s.layout : 'full',
      tone: ['warm', 'neutral', 'playful'].includes(s.tone) ? s.tone : 'warm',
      hideOnOpen: !!s.hideOnOpen,
      splash: s.splash !== false,
      dueWarnDays: clampInt(s.dueWarnDays, 1, 15, 5),
    },
    budget: { monthlyLimit: Math.max(0, int(raw.budget?.monthlyLimit)) },
    salary: {
      base: Math.max(0, int(raw.salary?.base)),
      usable: raw.salary?.usable !== false,
      overrides: Object.fromEntries(Object.entries(raw.salary?.overrides || {})
        .filter(([k, v]) => isYM(k) && Number.isFinite(v)).map(([k, v]) => [k, Math.round(v)])),
    },
    incomes: arr(raw.incomes).filter((i) => i && isISO(i.date) && Number.isFinite(i.amount)).map((i) => ({
      id: str(i.id, 80) || uid('i'), desc: str(i.desc, 120, 'Entrada'), amount: int(i.amount), date: i.date, usable: i.usable !== false,
    })),
    banks: arr(raw.banks).filter((b) => b && typeof b.name === 'string').map((b) => ({
      id: str(b.id, 80) || uid('b'), name: str(b.name, 60), balance: int(b.balance), color: col(b.color, '#BCD7F5'), icon: ico(b.icon, 'fa-building-columns'), usable: !!b.usable,
    })),
    cards: arr(raw.cards).filter((c) => c && typeof c.name === 'string').map((c) => ({
      id: str(c.id, 80) || uid('card'), name: str(c.name, 60), closingDay: clampInt(c.closingDay, 1, 31, 20), dueDay: clampInt(c.dueDay, 1, 31, 5),
      color: col(c.color, '#B9A6EE'), active: c.active !== false, limit: Math.max(0, int(c.limit)),
    })),
    categories: arr(raw.categories).filter((c) => c && typeof c.name === 'string' && c.id).map((c) => ({
      id: str(c.id, 80), name: str(c.name, 40), color: col(c.color, '#D9D9E3'), icon: ico(c.icon, 'fa-tag'),
    })),
    expenses: arr(raw.expenses).map(normalizeExpense).filter(Boolean),
    trash: arr(raw.trash).map(normalizeExpense).filter(Boolean),
    bills: arr(raw.bills).filter((r) => r && typeof r.name === 'string').map((r) => ({
      id: str(r.id, 80) || uid('r'), name: str(r.name, 80), amount: Math.max(0, int(r.amount)), day: clampInt(r.day, 1, 31, 1), warnDays: clampInt(r.warnDays, 1, 15, 5),
    })),
    simItems: arr(raw.simItems).filter((x) => x && Number.isFinite(x.total)).map((x) => ({
      id: str(x.id, 80) || uid('s'), name: str(x.name, 80, 'Item'), total: int(x.total), inst: clampInt(x.inst, 1, 120, 1),
      rate: Number.isFinite(x.rate) ? Math.max(0, x.rate) : 0, monthly: int(x.monthly), totalWithInterest: int(x.totalWithInterest),
    })),
    meta: { importedFrom: arr(raw.meta?.importedFrom).slice(-20) },
  };
  if (!out.categories.length) out.categories = d.categories;
  return out;
}

// ---------------------------------------------------------------------------
// Migrações: MIGRATIONS[n] leva os dados do schema n para n+1.
// Quando o schema mudar, adicione aqui e suba SCHEMA. Uma cópia é salva antes.
// ---------------------------------------------------------------------------
const MIGRATIONS = {
  // 1: (data) => { ...; return data; },
};

export function migrate(raw) {
  let data = raw;
  let v = Number.isInteger(data?.schema) ? data.schema : 1;
  if (v > SCHEMA) throw new Error(`Dados de uma versão mais nova do ChaMony (schema ${v}). Atualize o app.`);
  while (v < SCHEMA) {
    safeSet(`${KEY}.antes-schema-${v + 1}`, JSON.stringify(data));
    data = MIGRATIONS[v](data);
    v += 1;
    data.schema = v;
  }
  return normalize(data);
}

// ---------------------------------------------------------------------------
// Estado em memória + persistência
// ---------------------------------------------------------------------------
let state = null;
const listeners = new Set();
let lastError = null;

function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (err) { lastError = err; return false; }
}

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage bloqueado: segue só em memória */ }
  if (!raw) { state = defaults(); return state; }
  try {
    state = migrate(JSON.parse(raw));
  } catch (err) {
    // Dados ilegíveis: preserva o texto original numa chave à parte e começa limpo.
    console.error('ChaMony: dados ilegíveis, guardando cópia', err);
    safeSet(`${KEY}.ilegivel-${Date.now()}`, raw);
    state = defaults();
    state._recovered = true;
  }
  return state;
}

export const get = () => state;

/** Aplica uma alteração, salva e avisa a interface. */
export function commit(mutator) {
  mutator(state);
  return persist();
}

function persist() {
  const ok = safeSet(KEY, JSON.stringify(state));
  if (!ok) window.dispatchEvent(new CustomEvent('chamony:storage-error', { detail: lastError }));
  listeners.forEach((fn) => fn(state));
  return ok;
}

/** Substitui tudo (restaurar backup/importar), guardando uma cópia do que existia. */
export function replaceAll(next) {
  try { const cur = localStorage.getItem(KEY); if (cur) safeSet(PREV_KEY, cur); } catch { /* ignore */ }
  state = normalize(next);
  return persist();
}

export function hasPrevious() {
  try { return !!localStorage.getItem(PREV_KEY); } catch { return false; }
}
export function restorePrevious() {
  const raw = localStorage.getItem(PREV_KEY);
  if (!raw) return false;
  const cur = localStorage.getItem(KEY);
  state = migrate(JSON.parse(raw));
  if (cur) safeSet(PREV_KEY, cur); // permite desfazer o desfazer
  return persist();
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Uso aproximado do armazenamento, para mostrar nos Ajustes. */
export function storageSize() {
  try { return (localStorage.getItem(KEY) || '').length * 2; } catch { return 0; }
}
