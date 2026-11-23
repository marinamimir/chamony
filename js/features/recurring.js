// Recorrentes: compras marcadas como recorrentes no mês + contas fixas com lembrete de vencimento.

import * as store from '../store.js';
import { esc, uid, clampInt } from '../core/dom.js';
import { m, attachMoneyMask } from '../core/money.js';
import { formatYM, inDays, shortDate } from '../core/dates.js';
import * as F from '../core/finance.js';
import { monthBar, sectionHead, chip, expenseRow } from '../ui/parts.js';
import { emptyState } from '../ui/illustrations.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

function openBillForm(id = null) {
  const b = store.get().bills.find((x) => x.id === id);
  openSheet({
    title: b ? 'Editar lembrete' : 'Nova conta com lembrete',
    body: `<label class="field"><span>Nome</span><input class="input" id="bl-name" maxlength="80" placeholder="Ex.: aluguel, internet, luz" value="${esc(b?.name || '')}" ${b ? '' : 'autofocus'}></label>
      <label class="field"><span>Valor aproximado</span><input class="input money" id="bl-val"></label>
      <div class="input-row">
        <label class="field"><span>Vence todo dia</span><input class="input" id="bl-day" type="number" inputmode="numeric" min="1" max="31" value="${b?.day ?? 10}"></label>
        <label class="field"><span>Avisar com (dias)</span><input class="input" id="bl-warn" type="number" inputmode="numeric" min="1" max="15" value="${b?.warnDays ?? 5}"></label>
      </div>
      <p class="tiny subtle">O aviso aparece no Início. Notificações no celular chegam numa próxima versão.</p>`,
    foot: `<div class="btn-row">${b ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir"><i class="fas fa-trash"></i></button>' : ''}<button type="button" class="btn primary" data-save>Salvar</button></div>`,
    onMount(el, api) {
      const val = attachMoneyMask(el.querySelector('#bl-val'), b?.amount || 0);
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-save]')) {
          const name = el.querySelector('#bl-name').value.trim();
          if (!name) { toast('Dê um nome para a conta'); return; }
          const data = { name, amount: val.get(), day: clampInt(el.querySelector('#bl-day').value, 1, 31, 10), warnDays: clampInt(el.querySelector('#bl-warn').value, 1, 15, 5) };
          store.commit((s) => { const cur = s.bills.find((x) => x.id === id); if (cur) Object.assign(cur, data); else s.bills.push({ id: uid('r'), ...data }); });
          api.close(); toast('Lembrete salvo');
        }
        if (e.target.closest('[data-del]')) {
          store.commit((s) => { s.bills = s.bills.filter((x) => x.id !== id); });
          api.close(); toast('Lembrete excluído', { action: { label: 'Desfazer', fn: () => store.commit((s) => { s.bills.push(b); }) } });
        }
      });
    },
  });
}

export default {
  id: 'recorrentes',
  title: 'Recorrentes',
  render({ d, ui }) {
    const rows = F.monthExpenses(d, ui.ym, { includeHidden: true }).filter((e) => e.recurring);
    const dues = F.upcomingDues(d, { horizon: 45 }).filter((x) => x.kind === 'bill');
    const nextOf = (id) => dues.find((x) => x.id === id);
    return `${monthBar(ui.ym)}
      <section class="card row">${chip('#E4D4F4', 'fa-rotate', 'lg')}
        <div class="grow"><div class="label" style="margin:0">Recorrentes em ${esc(formatYM(ui.ym).toLowerCase())}</div><div class="strong num" style="font-size:1.35rem">${m(F.sum(rows))}</div>
        <p class="tiny muted">Compras marcadas como “recorrente”. Cada mês usa o valor registrado.</p></div></section>
      ${sectionHead('Contas com lembrete', '<button type="button" class="link-btn" data-act="new-bill"><i class="fas fa-plus"></i> Nova</button>')}
      ${d.bills.length ? `<div class="list">${d.bills.map((b) => { const n = nextOf(b.id); return `
        <div class="list-row tap" role="button" tabindex="0" data-act="edit-bill" data-id="${esc(b.id)}">${chip('#FFF0B3', 'fa-bell')}
          <div class="list-row__main"><div class="list-row__title">${esc(b.name)}</div>
            <div class="list-row__meta">Todo dia ${b.day}${n ? ` · próximo ${esc(shortDate(n.date))} (${esc(inDays(n.days))})` : ''}</div></div>
          <div class="list-row__value">${m(b.amount)}${n?.warn ? '<div><span class="badge warn">em breve</span></div>' : ''}</div></div>`; }).join('')}</div>`
        : `<div class="card">${emptyState('tea', 'Nenhum lembrete', 'Cadastre aluguel, internet ou luz para ver os vencimentos no Início.')}</div>`}
      ${sectionHead(`Compras recorrentes (${rows.length})`)}
      ${rows.length ? `<div class="list">${rows.map((e) => expenseRow(d, e)).join('')}</div>` : '<p class="small muted center">Edite uma compra e ligue “Recorrente” para ela aparecer aqui.</p>'}`;
  },
  actions: {
    'new-bill': () => openBillForm(),
    'edit-bill': (el) => openBillForm(el.dataset.id),
  },
};
