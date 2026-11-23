// Regras de finanças portadas do AeroSync (aerosync.html, módulo FIN_KEY), agora em centavos.
// Todas as funções recebem os dados (`d`) explicitamente: fáceis de testar e sem estado escondido.

import { shiftYM, todayISO, dateInMonth, daysBetween, addDays } from './dates.js';
import { fold } from './dom.js';

export const PIX = { id: 'pix', name: 'Pix / Conta', color: '#8FD3B6', icon: 'fa-bolt' };
const UNKNOWN_CAT = { id: '', name: 'Outros', color: '#D9D9E3', icon: 'fa-tag' };

/** Mês da fatura em que a compra cai: compra depois do fechamento vai para o mês seguinte; Pix cai no próprio mês. */
export function firstBillingYM(d, purchaseDate, cardId) {
  const ym = purchaseDate.slice(0, 7);
  if (!cardId || cardId === 'pix') return ym;
  const card = d.cards.find((c) => c.id === cardId);
  if (!card) return ym;
  const day = Number(purchaseDate.slice(8, 10));
  return shiftYM(ym, day > (card.closingDay || 31) ? 1 : 0);
}

/** Mês efetivo de uma linha (parcela N cai N-1 meses depois da primeira). */
export function billingYM(d, e) {
  if (e.billYM) return e.billYM; // importado: vale o mês impresso na fatura do banco
  return shiftYM(firstBillingYM(d, e.purchaseDate, e.cardId), (e.instIndex || 1) - 1);
}

export function isCardVisible(d, cardId) {
  if (!cardId || cardId === 'pix') return true;
  const c = d.cards.find((x) => x.id === cardId);
  return c ? c.active : true;
}

export function monthExpenses(d, ym, { includeHidden = false, filter = null } = {}) {
  return d.expenses.filter((e) => (includeHidden || isCardVisible(d, e.cardId)) && billingYM(d, e) === ym && (!filter || matchesFilter(e, filter)));
}

export const sum = (list, key = 'amount') => list.reduce((s, x) => s + (x[key] || 0), 0);

export function salaryFor(d, ym) {
  const o = d.salary.overrides[ym];
  return Number.isFinite(o) ? o : d.salary.base;
}
export const hasSalaryOverride = (d, ym) => Number.isFinite(d.salary.overrides[ym]);
export const extraIncomes = (d, ym) => d.incomes.filter((i) => i.date.slice(0, 7) === ym);
export function usableIncome(d, ym) {
  return (d.salary.usable ? salaryFor(d, ym) : 0) + sum(extraIncomes(d, ym).filter((i) => i.usable));
}
export const usableBanks = (d) => sum(d.banks.filter((b) => b.usable), 'balance');
export const reserveBanks = (d) => sum(d.banks.filter((b) => !b.usable), 'balance');
export const totalBanks = (d) => sum(d.banks, 'balance');

/** Dinheiro disponível no mês (contas de uso livre + salário + entradas usáveis). */
export const available = (d, ym) => usableBanks(d) + usableIncome(d, ym);
export const spent = (d, ym, filter) => sum(monthExpenses(d, ym, { filter }));
/** Saldo livre = disponível − gastos/faturas do mês (mesma conta da Visão Geral do AeroSync). */
export const freeBalance = (d, ym) => available(d, ym) - spent(d, ym);

export function resolveCat(d, e) {
  const found = d.categories.find((c) => c.id === e.catId);
  if (found) return found;
  if (e.catSnap?.name) return { id: e.catId, ...e.catSnap };
  return UNKNOWN_CAT;
}
export function payMethod(d, cardId) {
  if (!cardId || cardId === 'pix') return PIX;
  const c = d.cards.find((x) => x.id === cardId);
  return c ? { ...c, icon: 'fa-credit-card' } : { id: cardId, name: 'Cartão removido', color: '#A7B0C2', icon: 'fa-credit-card' };
}
export const catSnapshot = (cat) => (cat ? { name: cat.name, color: cat.color, icon: cat.icon } : null);

/** Gastos agrupados por categoria, do maior para o menor. */
export function byCategory(d, list) {
  const total = sum(list);
  const map = new Map();
  for (const e of list) {
    const c = resolveCat(d, e);
    const key = c.id || c.name;
    const cur = map.get(key) || { id: c.id, name: c.name, color: c.color, icon: c.icon, sum: 0, count: 0 };
    cur.sum += e.amount; cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].map((c) => ({ ...c, pct: total ? c.sum / total : 0 })).sort((a, b) => b.sum - a.sum);
}

/** Série de N meses terminando em ym. */
export function monthsSeries(d, ym, n = 5, filter = null) {
  return Array.from({ length: n }, (_, i) => {
    const k = shiftYM(ym, i - (n - 1));
    return { ym: k, spent: spent(d, k, filter), income: usableIncome(d, k), isCurrent: i === n - 1 };
  });
}

export const invoice = (d, cardId, ym) => sum(d.expenses.filter((e) => e.cardId === cardId && billingYM(d, e) === ym));

/** Mês da fatura que vence na data `dueISO` para um cartão (vencimento antes do fechamento ⇒ fatura do mês anterior). */
export function invoiceYMForDue(card, dueISO) {
  const ym = dueISO.slice(0, 7);
  return card.dueDay > card.closingDay ? ym : shiftYM(ym, -1);
}

/**
 * Próximos vencimentos (faturas de cartão + contas com lembrete) dentro de `horizon` dias.
 * Retorna { kind, id, name, amount, date, days, color, icon } ordenado por data.
 */
export function upcomingDues(d, { today = todayISO(), horizon = 31 } = {}) {
  const out = [];
  const ym = today.slice(0, 7);
  for (const card of d.cards.filter((c) => c.active)) {
    for (const k of [ym, shiftYM(ym, 1)]) {
      const date = dateInMonth(k, card.dueDay);
      const days = daysBetween(today, date);
      if (days < 0 || days > horizon) continue;
      const amount = invoice(d, card.id, invoiceYMForDue(card, date));
      if (amount > 0) out.push({ kind: 'card', id: card.id, name: `Fatura ${card.name}`, amount, date, days, color: card.color, icon: 'fa-credit-card', warn: days <= d.settings.dueWarnDays });
      break;
    }
  }
  for (const b of d.bills) {
    for (const k of [ym, shiftYM(ym, 1)]) {
      const date = dateInMonth(k, b.day);
      const days = daysBetween(today, date);
      if (days < 0 || days > horizon) continue;
      out.push({ kind: 'bill', id: b.id, name: b.name, amount: b.amount, date, days, color: '#F5CF7A', icon: 'fa-bell', warn: days <= b.warnDays });
      break;
    }
  }
  // Assinaturas ativas (anuais só no mês da cobrança)
  for (const x of d.subscriptions || []) {
    if (!x.active) continue;
    for (const k of [ym, shiftYM(ym, 1)]) {
      if (x.cycle === 'yearly' && Number(k.slice(5, 7)) !== x.month) continue;
      const date = dateInMonth(k, x.day);
      const days = daysBetween(today, date);
      if (days < 0 || days > horizon) continue;
      out.push({ kind: 'sub', id: x.id, name: x.name, amount: x.amount, date, days, color: x.color, icon: 'fa-rotate', warn: days <= 2 });
      break;
    }
  }
  // Dívidas em aberto com dia de vencimento
  for (const x of d.debts || []) {
    if (x.kind !== 'owe' || x.closedAt || !x.dueDay) continue;
    const left = x.total - x.payments.reduce((s, p) => s + p.amount, 0);
    if (left <= 0) continue;
    for (const k of [ym, shiftYM(ym, 1)]) {
      const date = dateInMonth(k, x.dueDay);
      const days = daysBetween(today, date);
      if (days < 0 || days > horizon) continue;
      out.push({ kind: 'debt', id: x.id, name: x.person || x.desc, amount: Math.min(left, Math.ceil(x.total / x.installments)), date, days, color: '#F9C5D1', icon: 'fa-handshake', warn: days <= d.settings.dueWarnDays });
      break;
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Dias seguidos sem gastar até hoje (compras à vista ou no cartão, pela data da compra). */
export function daysWithoutSpending(d, today = todayISO()) {
  const dates = d.expenses.filter((e) => (e.instIndex || 1) === 1).map((e) => e.purchaseDate).filter((x) => x <= today).sort();
  const last = dates.pop();
  return last ? daysBetween(last, today) : null;
}

// ---------------------------------------------------------------------------
// Filtros (categoria múltipla, forma de pagamento, texto) — como no AeroSync
// ---------------------------------------------------------------------------
export const emptyFilter = () => ({ cats: [], card: 'all', text: '', tags: [] });
export const isFilterActive = (f) => !!f && (f.cats.length > 0 || f.card !== 'all' || !!f.text || !!f.tags?.length);
export function matchesFilter(e, f) {
  if (!f) return true;
  if (f.cats.length && !f.cats.includes(e.catId)) return false;
  if (f.card !== 'all' && (e.cardId || 'pix') !== f.card) return false;
  if (f.tags?.length && !f.tags.some((t) => (e.tags || []).includes(t))) return false;
  if (f.text) {
    const q = fold(f.text);
    if (!fold(e.desc).includes(q) && !fold(e.note).includes(q) && !(e.tags || []).some((t) => fold(t).includes(q.replace(/^#/, '')))) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Grupos (compra parcelada = várias linhas com o mesmo groupId)
// ---------------------------------------------------------------------------
export const groupRows = (list, gid) => list.filter((e) => (e.groupId || e.id) === gid).sort((a, b) => a.instIndex - b.instIndex);
export const groupTotal = (rows) => sum(rows);

/** Simulador: parcela com juros compostos (tabela Price), igual ao AeroSync. */
export function simulate(totalCents, inst, ratePct) {
  const r = (Number(ratePct) || 0) / 100;
  const monthly = r > 0 && inst > 1 ? Math.round((totalCents * r) / (1 - Math.pow(1 + r, -inst))) : Math.round(totalCents / inst);
  return { monthly, totalWithInterest: monthly * inst };
}

export { addDays };
