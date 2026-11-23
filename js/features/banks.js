// Contas e cofres: saldo de uso livre (entra no mês) e reserva guardada.

import * as store from '../store.js';
import { esc, uid } from '../core/dom.js';
import { m, attachMoneyMask } from '../core/money.js';
import { ACCENT_COLORS, BANK_ICONS, CAT_COLORS } from '../store.js';
import * as F from '../core/finance.js';
import { toggle, sectionHead, chip, colorPicks, bindFreeColor } from '../ui/parts.js';
import { openSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

const COLORS = [...new Set([...CAT_COLORS.slice(0, 6), ...ACCENT_COLORS.slice(0, 4)])];

export function openBankForm(bankId = null) {
  const d = store.get();
  const b = d.banks.find((x) => x.id === bankId);
  const st = { color: b?.color || COLORS[d.banks.length % COLORS.length], icon: b?.icon || 'fa-building-columns', usable: b ? b.usable : true };
  const picks = () => `
    <span class="label">Cor</span><div class="pills wrap mb-3">${colorPicks(COLORS, st.color)}</div>
    <span class="label">Ícone</span><div class="pills wrap mb-3">${BANK_ICONS.map((i) => `<button type="button" class="icon-pick" data-icon="${i}" aria-pressed="${st.icon === i}"><i class="fas ${i}"></i></button>`).join('')}</div>
    <div class="setting-row"><div><b>Dinheiro de uso livre</b><small>Soma no saldo do mês. Desligado = reserva guardada.</small></div>
      <button type="button" class="toggle" role="switch" data-usable aria-checked="${st.usable}" aria-label="Uso livre"></button></div>`;
  openSheet({
    title: b ? 'Editar conta' : 'Nova conta ou cofre',
    body: `<label class="field"><span>Nome</span><input class="input" id="bk-name" maxlength="60" placeholder="Ex.: Nubank, Caixinha, Poupança" value="${esc(b?.name || '')}" ${b ? '' : 'autofocus'}></label>
      <label class="field"><span>Saldo atual</span><input class="input money" id="bk-bal"></label><div id="bk-picks">${picks()}</div>`,
    foot: `<div class="btn-row">${b ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir"><i class="fas fa-trash"></i></button>' : ''}<button type="button" class="btn primary" data-save>Salvar</button></div>`,
    onMount(el, api) {
      const bal = attachMoneyMask(el.querySelector('#bk-bal'), Math.max(0, b?.balance || 0));
      bindFreeColor(el, (x) => { st.color = x; el.querySelector('#bk-picks').innerHTML = picks(); });
      el.addEventListener('click', async (e) => {
        const col = e.target.closest('[data-color]'); if (col) { st.color = col.dataset.color; el.querySelector('#bk-picks').innerHTML = picks(); }
        const ic = e.target.closest('[data-icon]'); if (ic) { st.icon = ic.dataset.icon; el.querySelector('#bk-picks').innerHTML = picks(); }
        if (e.target.closest('[data-usable]')) { st.usable = !st.usable; el.querySelector('#bk-picks').innerHTML = picks(); }
        if (e.target.closest('[data-save]')) {
          const name = el.querySelector('#bk-name').value.trim();
          if (!name) { toast('Dê um nome para a conta'); return; }
          store.commit((s) => {
            const cur = s.banks.find((x) => x.id === bankId);
            const data = { name, balance: bal.get(), ...st };
            if (cur) Object.assign(cur, data); else s.banks.push({ id: uid('b'), ...data });
          });
          api.close(); toast('Conta salva');
        }
        if (e.target.closest('[data-del]')) {
          api.close();
          if (await confirmSheet({ title: `Excluir ${b.name}?`, text: 'O saldo desta conta deixa de contar no app.', confirm: 'Excluir', danger: true })) {
            store.commit((s) => { s.banks = s.banks.filter((x) => x.id !== bankId); }); toast('Conta excluída');
          }
        }
      });
    },
  });
}

export default {
  id: 'contas',
  title: 'Contas e cofres',
  render({ d }) {
    return `<div class="grid-2 mb-3">
        <div class="stat"><span>Uso livre</span><b class="num">${m(F.usableBanks(d))}</b></div>
        <div class="stat"><span>Reserva guardada</span><b class="num">${m(F.reserveBanks(d))}</b></div>
      </div>
      ${sectionHead(`Contas (${d.banks.length})`, '<button type="button" class="link-btn" data-act="new-bank"><i class="fas fa-plus"></i> Nova</button>')}
      <div class="list">${d.banks.map((b) => `
        <div class="list-row">
          ${chip(b.color, b.icon)}
          <button type="button" class="list-row__main" data-act="edit-bank" data-id="${esc(b.id)}" style="border:0;background:none;text-align:left;padding:0">
            <div class="list-row__title">${esc(b.name)}</div><div class="list-row__meta">${b.usable ? 'Uso livre · soma no mês' : 'Reserva guardada'}</div></button>
          <div class="list-row__value">${m(b.balance)}</div>
          ${toggle(b.usable, 'toggle-bank', `Uso livre: ${b.name}`, `data-id="${esc(b.id)}"`)}
        </div>`).join('') || '<div class="list-row"><span class="muted small">Nenhuma conta cadastrada.</span></div>'}</div>
      <p class="tiny subtle mt-3">Patrimônio total: ${m(F.totalBanks(d))}. Contas de uso livre entram no saldo livre do mês; a reserva fica só guardada.</p>`;
  },
  actions: {
    'new-bank': () => openBankForm(),
    'edit-bank': (el) => openBankForm(el.dataset.id),
    'toggle-bank': (el) => store.commit((s) => { const b = s.banks.find((x) => x.id === el.dataset.id); if (b) b.usable = !b.usable; }),
  },
};
