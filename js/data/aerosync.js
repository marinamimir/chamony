// Importação dos dados do AeroSync.
//
// Formatos aceitos (conferidos em marinamimir/aerosync → aerosync.html):
//  1. Backup do AeroSync/ALife: { app: 'ALife' | 'AeroSync', version: 2, exported, data: { 'aerosync.finances.v2': {...}, 'aerosync.finance': {...}, ... } }
//  2. JSON direto de `aerosync.finances.v2` (ou `.v1`, mesmo formato): { salaryBase, salaryUsable, salaryOverrides, incomes, banks, cards, categories, expenses, trash, recurring, simItems }
//     → valores em REAIS (número decimal). Convertidos aqui para centavos.
//  3. JSON do módulo simples `aerosync.finance`: { limit, cats: [{id,name,icon,color}], exp: [{id, v, c, d, n}] } → já em centavos.
//  4. Leitura direta do localStorage, quando o ChaMony está publicado no mesmo endereço (origem) do AeroSync.

import { reaisToCents } from '../core/money.js';
import { isISO, isYM } from '../core/dates.js';
import { plural } from '../core/dom.js';

export const AERO_KEYS = { v2: 'aerosync.finances.v2', v1: 'aerosync.finances.v1', simple: 'aerosync.finance' };

const parseMaybe = (v) => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return null; }
};
const looksFull = (o) => o && typeof o === 'object' && (Array.isArray(o.expenses) || Array.isArray(o.cards) || 'salaryBase' in o);
const looksSimple = (o) => o && typeof o === 'object' && Array.isArray(o.exp) && Array.isArray(o.cats);

/** Procura dados do AeroSync dentro de um JSON qualquer. Retorna { full, simple, origin } ou null. */
export function detect(json) {
  if (!json || typeof json !== 'object') return null;
  if (['ALife', 'AeroSync'].includes(json.app) && json.data && typeof json.data === 'object') {
    const full = parseMaybe(json.data[AERO_KEYS.v2]) || parseMaybe(json.data[AERO_KEYS.v1]);
    const simple = parseMaybe(json.data[AERO_KEYS.simple]);
    const r = { full: looksFull(full) ? full : null, simple: looksSimple(simple) ? simple : null, origin: `backup ${json.app}` };
    return r.full || r.simple ? r : null;
  }
  if (looksFull(json)) return { full: json, simple: null, origin: 'JSON aerosync.finances' };
  if (looksSimple(json)) return { full: null, simple: json, origin: 'JSON aerosync.finance' };
  return null;
}

/** Lê direto do navegador (só funciona na mesma origem do AeroSync, ex.: usuario.github.io). */
export function readLocal() {
  try {
    const full = parseMaybe(localStorage.getItem(AERO_KEYS.v2)) || parseMaybe(localStorage.getItem(AERO_KEYS.v1));
    const simple = parseMaybe(localStorage.getItem(AERO_KEYS.simple));
    const r = { full: looksFull(full) ? full : null, simple: looksSimple(simple) ? simple : null, origin: 'AeroSync neste navegador' };
    return r.full || r.simple ? r : null;
  } catch {
    return null;
  }
}

const arr = (v) => (Array.isArray(v) ? v : []);
const snap = (e) => (e.catNameSnapshot ? { name: e.catNameSnapshot, color: e.catColorSnapshot || '#D9D9E3', icon: e.catIconSnapshot || 'fa-tag' } : null);

function convertExpense(e) {
  const purchaseDate = isISO(e.purchaseDate) ? e.purchaseDate : isISO(e.date) ? e.date : null;
  if (!purchaseDate) return null;
  const amount = reaisToCents(e.amount);
  if (!(amount > 0)) return null;
  return {
    id: String(e.id || ''), groupId: String(e.groupId || e.id || ''),
    desc: String(e.desc || 'Compra'), amount, purchaseDate,
    time: e.time, cardId: e.cardId || 'pix', catId: e.catId || '', catSnap: snap(e),
    instIndex: Number(e.instIndex) || 1, instTotal: Number(e.instTotal) || 1,
    recurring: !!e.recurring, source: 'aerosync',
  };
}

/** Converte o módulo completo (finances.v2/v1, valores em reais) para o modelo do ChaMony (centavos). */
export function convertFull(f) {
  const overrides = {};
  for (const [k, v] of Object.entries(f.salaryOverrides || {})) {
    if (isYM(k) && v !== '' && v !== null && Number.isFinite(Number(v))) overrides[k] = reaisToCents(v);
  }
  return {
    salary: { base: reaisToCents(f.salaryBase), usable: f.salaryUsable !== false, overrides },
    incomes: arr(f.incomes).map((i) => ({ id: i.id, desc: i.desc, amount: reaisToCents(i.amount), date: i.date, usable: i.usable !== false })),
    banks: arr(f.banks).map((b) => ({ id: b.id, name: b.name, balance: reaisToCents(b.balance), color: b.color, icon: b.icon, usable: !!b.usable })),
    cards: arr(f.cards).map((c) => ({ id: c.id, name: c.name, closingDay: Number(c.closingDay), dueDay: Number(c.dueDay), color: c.color, active: c.active !== false, limit: 0 })),
    categories: arr(f.categories).map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon })),
    expenses: arr(f.expenses).map(convertExpense).filter(Boolean),
    trash: arr(f.trash).map(convertExpense).filter(Boolean),
    bills: arr(f.recurring).map((r) => ({ id: r.id, name: r.name, amount: reaisToCents(r.amount), day: Number(r.day), warnDays: Number(r.warnDays) || 5 })),
    simItems: arr(f.simItems).map((s) => ({
      id: s.id, name: s.name, total: reaisToCents(s.val), inst: Number(s.inst) || 1, rate: Number(s.rate) || 0,
      monthly: reaisToCents(s.monthly), totalWithInterest: reaisToCents(s.totalWithInterest),
    })),
  };
}

/** Converte o módulo simples (aerosync.finance, já em centavos) — gastos viram compras no Pix. */
export function convertSimple(s) {
  const cats = arr(s.cats).map((c) => ({ id: 'as-' + c.id, name: c.name, color: c.color, icon: c.icon }));
  const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
  return {
    budget: { monthlyLimit: Number.isFinite(s.limit) ? Math.round(s.limit) : 0 },
    categories: cats,
    expenses: arr(s.exp).filter((e) => isISO(e.d) && Number.isFinite(e.v) && e.v > 0).map((e) => {
      const cat = byId['as-' + e.c];
      return {
        id: 'as-' + e.id, groupId: 'as-' + e.id, desc: e.n || cat?.name || 'Gasto', amount: Math.round(e.v), purchaseDate: e.d,
        time: '12:00', cardId: 'pix', catId: 'as-' + e.c, catSnap: cat ? { name: cat.name, color: cat.color, icon: cat.icon } : null,
        instIndex: 1, instTotal: 1, source: 'aerosync-simples',
      };
    }),
  };
}

/** Resumo para a tela de prévia. */
export function summarize(found) {
  const out = [];
  if (found.full) {
    const f = found.full;
    const groups = new Set(arr(f.expenses).map((e) => e.groupId || e.id));
    out.push({
      key: 'full', title: 'Finanças completas (Visão Geral, Cartões, Compras…)',
      lines: [
        `${plural(groups.size, 'compra', 'compras')} (${plural(arr(f.expenses).length, 'lançamento', 'lançamentos')})`,
        `${plural(arr(f.cards).length, 'cartão', 'cartões')} · ${plural(arr(f.categories).length, 'categoria', 'categorias')} · ${plural(arr(f.banks).length, 'conta', 'contas')}`,
        `${plural(arr(f.incomes).length, 'entrada extra', 'entradas extras')} · ${plural(arr(f.recurring).length, 'conta com lembrete', 'contas com lembrete')} · ${arr(f.trash).length} na lixeira`,
      ],
    });
  }
  if (found.simple) {
    out.push({
      key: 'simple', title: 'Gastos rápidos (módulo simples do AeroSync)',
      lines: [`${plural(arr(found.simple.exp).length, 'gasto', 'gastos')} · ${plural(arr(found.simple.cats).length, 'categoria', 'categorias')}`],
    });
  }
  return out;
}

/** Monta os dados a importar conforme a escolha do usuário. */
export function build(found, { full = true, simple = false } = {}) {
  const parts = [];
  if (full && found.full) parts.push(convertFull(found.full));
  if (simple && found.simple) parts.push(convertSimple(found.simple));
  const out = { categories: [], cards: [], banks: [], expenses: [], trash: [], incomes: [], bills: [], simItems: [] };
  for (const p of parts) {
    for (const k of Object.keys(out)) out[k].push(...(p[k] || []));
    if (p.salary) out.salary = p.salary;
    if (p.budget) out.budget = p.budget;
  }
  return out;
}
