// Ações sobre compras: lixeira (com "Desfazer"), restaurar, excluir de vez, edição em massa.

import * as store from '../store.js';
import { toast } from '../ui/toast.js';
import { catSnapshot } from '../core/finance.js';
import { isISO } from '../core/dates.js';
import { deleteReceipt } from '../data/idb.js';

const gidOf = (e) => e.groupId || e.id;

/** Move grupos (compra + parcelas) para a lixeira. */
export function trashGroups(gids) {
  const set = new Set(gids);
  let moved = [];
  store.commit((s) => {
    const now = new Date().toISOString();
    moved = s.expenses.filter((e) => set.has(gidOf(e)));
    s.expenses = s.expenses.filter((e) => !set.has(gidOf(e)));
    s.trash.push(...moved.map((e) => ({ ...e, deletedAt: now })));
  });
  if (!moved.length) return;
  toast(set.size > 1 ? `${set.size} compras foram para a lixeira` : 'Compra movida para a lixeira', {
    action: { label: 'Desfazer', fn: () => restoreGroups([...set]) },
  });
}

export function restoreGroups(gids) {
  const set = new Set(gids);
  store.commit((s) => {
    const back = s.trash.filter((e) => set.has(gidOf(e))).map(({ deletedAt, ...e }) => e);
    s.trash = s.trash.filter((e) => !set.has(gidOf(e)));
    s.expenses.push(...back);
  });
}

export function purgeGroups(gids) {
  const set = new Set(gids);
  const gone = store.get().trash.filter((e) => set.has(gidOf(e)));
  store.commit((s) => { s.trash = s.trash.filter((e) => !set.has(gidOf(e))); });
  cleanupReceipts(gone);
}

/** Apaga do IndexedDB as fotos que nenhuma compra (nem a lixeira) usa mais. */
export function cleanupReceipts(removed) {
  const d = store.get();
  const used = new Set([...d.expenses, ...d.trash].map((e) => e.receiptId).filter(Boolean));
  [...new Set(removed.map((e) => e.receiptId).filter(Boolean))].filter((id) => !used.has(id)).forEach((id) => deleteReceipt(id).catch(() => {}));
}

/** Edição em massa: troca forma de pagamento, categoria e/ou data de todas as compras selecionadas. */
export function bulkEdit(gids, { cardId = '', catId = '', date = '' }) {
  const set = new Set(gids);
  store.commit((s) => {
    const cat = s.categories.find((c) => c.id === catId);
    for (const e of s.expenses) {
      if (!set.has(gidOf(e))) continue;
      if (cardId && cardId !== e.cardId) { e.cardId = cardId; delete e.billYM; }
      if (cat) { e.catId = cat.id; e.catSnap = catSnapshot(cat); }
      if (isISO(date) && date !== e.purchaseDate) { e.purchaseDate = date; delete e.billYM; }
    }
  });
}
