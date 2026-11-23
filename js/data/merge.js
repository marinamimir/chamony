// Junta dados importados com os existentes sem duplicar nem trocar categorias de lugar.
// - Categorias, cartões e contas com o mesmo nome (sem acento/maiúsculas) são reaproveitados.
// - IDs que colidem com itens diferentes ganham um ID novo, e as compras são remapeadas.
// - Compras, entradas, lembretes e simulações com ID já existente são ignorados (reimportar não duplica).

import { fold, uid } from '../core/dom.js';
import { normalize, normalizeExpense } from '../store.js';

function mergeNamed(current, incoming, prefix) {
  const map = {}; // id importado → id final
  const added = [];
  for (const item of incoming || []) {
    if (!item || !item.name) continue;
    const same = current.find((c) => fold(c.name) === fold(item.name));
    if (same) {
      map[item.id] = same.id;
      // Conta com o mesmo nome ainda sem saldo: assume o saldo importado.
      if ('balance' in item && !same.balance && item.balance) same.balance = item.balance;
      continue;
    }
    let id = item.id || uid(prefix);
    if (current.some((c) => c.id === id) || added.some((c) => c.id === id)) id = uid(prefix);
    map[item.id] = id;
    added.push({ ...item, id });
  }
  return { map, added };
}

function mergeById(current, incoming) {
  const ids = new Set(current.map((x) => x.id));
  return (incoming || []).filter(Boolean).map((x) => (x.id ? x : { ...x, id: uid('x') })).filter((x) => !ids.has(x.id));
}

/**
 * @param {object} cur dados atuais (normalizados)
 * @param {object} inc dados importados (parciais)
 * @returns {{ data: object, stats: object }}
 */
export function mergeData(cur, inc) {
  const next = structuredClone(cur);
  const cats = mergeNamed(next.categories, inc.categories, 'c');
  const cards = mergeNamed(next.cards, inc.cards, 'card');
  const banks = mergeNamed(next.banks, inc.banks, 'b');
  next.categories.push(...cats.added);
  next.cards.push(...cards.added);
  next.banks.push(...banks.added);

  // IDs que não existem no arquivo importado (categoria/cartão já apagados lá) viram órfãos com prefixo,
  // para não colidir com um item diferente daqui. A compra continua mostrando o nome guardado (catSnap).
  const incCats = new Set((inc.categories || []).map((c) => c.id));
  const incCards = new Set((inc.cards || []).map((c) => c.id));
  const orphan = (id) => (id && !String(id).startsWith('orf-') ? `orf-${id}` : id);
  const remap = (e) => ({
    ...e,
    catId: cats.map[e.catId] ?? (incCats.has(e.catId) || !inc.categories ? e.catId : orphan(e.catId)),
    cardId: !e.cardId || e.cardId === 'pix' ? 'pix' : (cards.map[e.cardId] ?? (incCards.has(e.cardId) || !inc.cards ? e.cardId : orphan(e.cardId))),
  });
  const newExpenses = mergeById(next.expenses.concat(next.trash), (inc.expenses || []).map(remap)).map(normalizeExpense).filter(Boolean);
  const newTrash = mergeById(next.expenses.concat(next.trash, newExpenses), (inc.trash || []).map(remap)).map(normalizeExpense).filter(Boolean);
  next.expenses.push(...newExpenses);
  next.trash.push(...newTrash);

  const newIncomes = mergeById(next.incomes, inc.incomes);
  const newBills = mergeById(next.bills, inc.bills);
  const newSims = mergeById(next.simItems, inc.simItems);
  next.incomes.push(...newIncomes);
  next.bills.push(...newBills);
  next.simItems.push(...newSims);
  // Coleções das fases 3 e 4 (metas, desejos, assinaturas, dívidas, investimentos, favoritos)
  const extra = {};
  for (const k of ['goals', 'wishes', 'subscriptions', 'debts', 'investments', 'favorites']) {
    const add = mergeById(next[k] || [], inc[k]);
    next[k] = [...(next[k] || []), ...add];
    extra[k] = add.length;
  }
  for (const [k, v] of Object.entries(inc.budget?.catLimits || {})) {
    const id = cats.map[k] ?? k;
    if (!next.budget.catLimits?.[id]) next.budget.catLimits = { ...next.budget.catLimits, [id]: v };
  }

  if (inc.salary) {
    if (!next.salary.base) { next.salary.base = inc.salary.base; next.salary.usable = inc.salary.usable; }
    for (const [k, v] of Object.entries(inc.salary.overrides || {})) if (!(k in next.salary.overrides)) next.salary.overrides[k] = v;
  }
  if (inc.budget?.monthlyLimit && !next.budget.monthlyLimit) next.budget.monthlyLimit = inc.budget.monthlyLimit;

  return {
    data: normalize(next),
    stats: {
      expenses: newExpenses.length, trash: newTrash.length, categories: cats.added.length, cards: cards.added.length,
      banks: banks.added.length, incomes: newIncomes.length, bills: newBills.length, simItems: newSims.length, ...extra,
    },
  };
}

/** Substitui os dados financeiros pelos importados, mantendo as preferências do ChaMony. */
export function replaceData(cur, inc) {
  const base = normalize({ settings: cur.settings, createdAt: cur.createdAt, meta: cur.meta });
  base.categories = [];
  base.banks = [];
  return mergeData(base, inc);
}
