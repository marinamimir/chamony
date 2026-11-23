// Lixeira: compras excluídas podem voltar.

import * as store from '../store.js';
import { esc } from '../core/dom.js';
import * as F from '../core/finance.js';
import { expenseRow } from '../ui/parts.js';
import { emptyState } from '../ui/illustrations.js';
import { confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { restoreGroups, purgeGroups, cleanupReceipts } from './expense-actions.js';

export default {
  id: 'lixeira',
  title: 'Lixeira',
  render({ d }) {
    const groups = new Map();
    for (const e of d.trash) { const g = e.groupId || e.id; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(e); }
    const items = [...groups.entries()].map(([gid, rows]) => ({ gid, rows: rows.sort((a, b) => a.instIndex - b.instIndex) }))
      .sort((a, b) => (b.rows[0].deletedAt || '').localeCompare(a.rows[0].deletedAt || ''));
    if (!items.length) return `<div class="card">${emptyState('leaf', 'Lixeira vazia', 'Compras excluídas ficam aqui e podem voltar quando você quiser.')}</div>`;
    return `<div class="row mb-3" style="justify-content:space-between"><p class="small muted">${items.length} compra(s) na lixeira</p>
      <button type="button" class="btn sm danger" data-act="empty-trash"><i class="fas fa-trash"></i>Esvaziar</button></div>
      <div class="list">${items.map(({ gid, rows }) => expenseRow(d, { ...rows[0], amount: F.groupTotal(rows) }, {
        trash: true, showDate: true,
        trailing: `<button type="button" class="icon-btn sm" data-act="restore" data-gid="${esc(gid)}" aria-label="Restaurar" style="color:var(--ui-success)"><i class="fas fa-rotate-left"></i></button>
          <button type="button" class="icon-btn sm danger" data-act="purge" data-gid="${esc(gid)}" aria-label="Excluir de vez"><i class="fas fa-xmark"></i></button>`,
      })).join('')}</div>`;
  },
  actions: {
    restore: (el) => { restoreGroups([el.dataset.gid]); toast('Compra restaurada'); },
    purge: async (el) => {
      if (await confirmSheet({ title: 'Excluir de vez?', text: 'Esta compra some para sempre.', confirm: 'Excluir', danger: true })) purgeGroups([el.dataset.gid]);
    },
    'empty-trash': async () => {
      if (await confirmSheet({ title: 'Esvaziar a lixeira?', text: 'Todas as compras da lixeira somem para sempre.', confirm: 'Esvaziar', danger: true })) {
        const gone = store.get().trash;
        store.commit((s) => { s.trash = []; }); cleanupReceipts(gone); toast('Lixeira esvaziada');
      }
    },
  },
};
