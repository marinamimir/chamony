// Dívidas e empréstimos: "eu devo" e "me devem", com parcelas, pagamentos e saldo restante.

import * as store from '../../store.js';
import { esc, uid, clampInt } from '../../core/dom.js';
import { m, fmt, attachMoneyMask } from '../../core/money.js';
import { todayISO, shortDate } from '../../core/dates.js';
import { chip } from '../../ui/parts.js';
import { emptyState } from '../../ui/illustrations.js';
import { openSheet, confirmSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { celebrate } from '../../ui/feedback.js';

export const debtPaid = (x) => x.payments.reduce((s, p) => s + p.amount, 0);
export const debtLeft = (x) => Math.max(0, x.total - debtPaid(x));
export const installmentValue = (x) => Math.ceil(x.total / x.installments);

function openDebtForm(id = null, kind = 'owe') {
  const x = store.get().debts.find((y) => y.id === id);
  let k = x?.kind || kind;
  const seg = () => `<button type="button" data-kind="owe" aria-pressed="${k === 'owe'}">Eu devo</button><button type="button" data-kind="owed" aria-pressed="${k === 'owed'}">Me devem</button>`;
  openSheet({
    title: x ? 'Editar' : 'Nova dívida ou empréstimo',
    body: `<div class="segmented mb-3" id="df-kind">${seg()}</div>
      <label class="field"><span>Com quem</span><input class="input" id="df-person" maxlength="80" placeholder="Banco, loja, pessoa…" value="${esc(x?.person || '')}"></label>
      <label class="field"><span>Descrição</span><input class="input" id="df-desc" maxlength="120" placeholder="Ex.: empréstimo do carro" value="${esc(x?.desc || '')}"></label>
      <label class="field"><span>Valor total</span><input class="input money" id="df-total"></label>
      <div class="input-row">
        <label class="field"><span>Parcelas</span><input class="input" id="df-inst" type="number" inputmode="numeric" min="1" max="360" value="${x?.installments ?? 1}"></label>
        <label class="field"><span>Vence todo dia</span><input class="input" id="df-day" type="number" inputmode="numeric" min="0" max="31" value="${x?.dueDay ?? 0}" placeholder="0 = sem dia"></label>
      </div><p class="tiny subtle">Dia 0 = sem dia fixo. Com dia, o vencimento aparece no Início.</p>`,
    foot: `<div class="btn-row">${x ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir"><i class="fas fa-trash"></i></button>' : ''}<button type="button" class="btn primary" data-save>Salvar</button></div>`,
    onMount(el, api) {
      const total = attachMoneyMask(el.querySelector('#df-total'), x?.total || 0);
      el.addEventListener('click', async (e) => {
        const kb = e.target.closest('[data-kind]'); if (kb) { k = kb.dataset.kind; el.querySelector('#df-kind').innerHTML = seg(); }
        if (e.target.closest('[data-save]')) {
          const person = el.querySelector('#df-person').value.trim(), desc = el.querySelector('#df-desc').value.trim();
          if (!(person || desc) || !(total.get() > 0)) { toast('Preencha com quem (ou descrição) e o valor'); return; }
          const data = { kind: k, person, desc, total: total.get(), installments: clampInt(el.querySelector('#df-inst').value, 1, 360, 1), dueDay: clampInt(el.querySelector('#df-day').value, 0, 31, 0) };
          store.commit((s) => { const cur = s.debts.find((y) => y.id === id); if (cur) Object.assign(cur, data); else s.debts.push({ id: uid('debt'), createdAt: new Date().toISOString(), closedAt: null, payments: [], ...data }); });
          api.close(); toast('Salvo');
        }
        if (e.target.closest('[data-del]')) {
          api.close();
          if (await confirmSheet({ title: 'Excluir este registro?', text: 'Os pagamentos registrados também somem.', confirm: 'Excluir', danger: true })) store.commit((s) => { s.debts = s.debts.filter((y) => y.id !== id); });
        }
      });
    },
  });
}

function openDebtDetail(id) {
  const title = (x) => x.person || x.desc;
  const body = (x) => {
    const left = debtLeft(x), paid = debtPaid(x);
    return `<p class="small muted mb-2">${x.kind === 'owe' ? 'Você deve' : 'Te devem'}${x.desc && x.person ? ` · ${esc(x.desc)}` : ''}</p>
      <div class="grid-2 mb-3"><div class="stat"><span>Falta</span><b class="num">${m(left)}</b></div><div class="stat"><span>${x.kind === 'owe' ? 'Pago' : 'Recebido'}</span><b class="num">${m(paid)}</b></div></div>
      <div class="bar mb-3"><i style="width:${x.total ? (paid / x.total) * 100 : 0}%;--c:var(--ui-success)"></i></div>
      ${left > 0 ? `<label class="field"><span>Valor ${x.kind === 'owe' ? 'pago' : 'recebido'} (parcela: ${fmt(installmentValue(x))})</span><input class="input money" id="dd-val"></label>
        <button type="button" class="btn primary block mb-3" data-pay><i class="fas fa-check"></i>Registrar ${x.kind === 'owe' ? 'pagamento' : 'recebimento'}</button>` : '<div class="notice ok mb-3"><i class="fas fa-circle-check"></i><span>Quitado! 🌼</span></div>'}
      <span class="label">Histórico</span>
      ${x.payments.length ? `<div class="list">${[...x.payments].reverse().map((p) => `<div class="list-row" style="min-height:52px"><div class="list-row__main"><div class="list-row__title">${esc(shortDate(p.date))}</div></div>
        <div class="list-row__value">${m(p.amount)}</div><button type="button" class="icon-btn sm danger" data-undo="${esc(p.id)}" aria-label="Apagar"><i class="fas fa-xmark"></i></button></div>`).join('')}</div>` : '<p class="small muted">Nada registrado ainda.</p>'}`;
  };
  const x0 = store.get().debts.find((y) => y.id === id);
  openSheet({
    title: title(x0), body: body(x0),
    foot: '<button type="button" class="btn ghost block" data-edit><i class="fas fa-pen"></i>Editar</button>',
    onMount(el, api) {
      let money = el.querySelector('#dd-val') ? attachMoneyMask(el.querySelector('#dd-val'), installmentValue(x0)) : null;
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-edit]')) { api.close(); openDebtForm(id); return; }
        const pay = e.target.closest('[data-pay]'), undo = e.target.closest('[data-undo]');
        if (!pay && !undo) return;
        let closed = false;
        store.commit((s) => {
          const x = s.debts.find((y) => y.id === id);
          if (pay && money?.get() > 0) x.payments.push({ id: uid('m'), date: todayISO(), amount: Math.min(money.get(), debtLeft(x)), note: '' });
          if (undo) x.payments = x.payments.filter((p) => p.id !== undo.dataset.undo);
          const done = debtLeft(x) === 0;
          closed = done && !x.closedAt;
          x.closedAt = done ? (x.closedAt || new Date().toISOString()) : null;
        });
        const x = store.get().debts.find((y) => y.id === id);
        api.setBody(body(x));
        money = el.querySelector('#dd-val') ? attachMoneyMask(el.querySelector('#dd-val'), Math.min(installmentValue(x), debtLeft(x))) : null;
        if (closed) celebrate(x.kind === 'owe' ? 'Dívida quitada!' : 'Tudo recebido!', 'Um peso a menos. Respira fundo e aproveita.', { artName: 'tea' });
      });
    },
  });
}

export const debtsTab = {
  title: 'Dívidas', icon: 'fa-handshake',
  render(d) {
    const open = d.debts.filter((x) => !x.closedAt), closed = d.debts.filter((x) => x.closedAt);
    const owe = open.filter((x) => x.kind === 'owe').reduce((s, x) => s + debtLeft(x), 0);
    const owed = open.filter((x) => x.kind === 'owed').reduce((s, x) => s + debtLeft(x), 0);
    const row = (x) => `<div class="list-row tap ${x.closedAt ? 'is-off' : ''}" role="button" tabindex="0" data-act="debt-open" data-id="${esc(x.id)}">
      ${chip(x.kind === 'owe' ? '#F9C5D1' : '#CDEBC5', x.kind === 'owe' ? 'fa-arrow-up-from-bracket' : 'fa-hand-holding-heart')}
      <div class="list-row__main"><div class="list-row__title">${esc(x.person || x.desc)}</div>
        <div class="list-row__meta">${x.kind === 'owe' ? 'Eu devo' : 'Me devem'}${x.installments > 1 ? ` · ${x.installments}x de ${fmt(installmentValue(x))}` : ''}${x.dueDay ? ` · dia ${x.dueDay}` : ''}</div>
        <div class="bar mt-2" style="height:6px"><i style="width:${x.total ? (debtPaid(x) / x.total) * 100 : 0}%;--c:var(--ui-success)"></i></div></div>
      <div class="list-row__value">${m(debtLeft(x))}<div class="tiny subtle">${x.closedAt ? 'quitado' : 'falta'}</div></div></div>`;
    return `<div class="grid-2 mb-3"><div class="stat"><span>Eu devo</span><b class="num">${m(owe)}</b></div><div class="stat"><span>Me devem</span><b class="num">${m(owed)}</b></div></div>
      ${open.length ? `<div class="list">${open.map(row).join('')}</div>` : `<div class="card">${emptyState('leaf', 'Nada pendente', 'Anote empréstimos, financiamentos ou quem te deve, e acompanhe as parcelas.')}</div>`}
      ${closed.length ? `<div class="section-head"><h2>Quitados</h2></div><div class="list">${closed.map(row).join('')}</div>` : ''}
      <div class="btn-row mt-4"><button type="button" class="btn ghost" data-act="debt-new" data-kind="owed"><i class="fas fa-plus"></i>Me devem</button><button type="button" class="btn primary" data-act="debt-new" data-kind="owe"><i class="fas fa-plus"></i>Eu devo</button></div>`;
  },
  actions: {
    'debt-new': (el) => openDebtForm(null, el.dataset.kind),
    'debt-open': (el) => openDebtDetail(el.dataset.id),
  },
};
