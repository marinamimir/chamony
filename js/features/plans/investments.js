// Investimentos: aportes, retiradas e rendimentos digitados pelo usuário (sem cotação automática).

import * as store from '../../store.js';
import { esc, uid } from '../../core/dom.js';
import { m, fmt, attachMoneyMask } from '../../core/money.js';
import { todayISO, shortDate, currentYM, shiftYM, shortYM, isISO } from '../../core/dates.js';
import { CAT_COLORS } from '../../store.js';
import { chip, colorPicks, bindFreeColor } from '../../ui/parts.js';
import { line } from '../../ui/charts.js';
import { emptyState } from '../../ui/illustrations.js';
import { openSheet, confirmSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';

const KINDS = ['Renda fixa', 'Tesouro Direto', 'Poupança', 'Ações', 'Fundos', 'Previdência', 'Cripto', 'Outro'];
const TYPES = { aporte: 'Aporte', retirada: 'Retirada', rendimento: 'Rendimento' };

const signed = (e) => (e.type === 'retirada' ? -Math.abs(e.amount) : e.type === 'aporte' ? Math.abs(e.amount) : e.amount);
export const invBalance = (x, until = '9999') => x.entries.filter((e) => e.date <= until).reduce((s, e) => s + signed(e), 0);
export const invInvested = (x) => x.entries.reduce((s, e) => s + (e.type === 'aporte' ? Math.abs(e.amount) : e.type === 'retirada' ? -Math.abs(e.amount) : 0), 0);
export const invYield = (x) => x.entries.filter((e) => e.type === 'rendimento').reduce((s, e) => s + e.amount, 0);
const pct = (a, b) => (b > 0 ? `${(a / b * 100).toFixed(1).replace('.', ',')}%` : '—');

function openInvForm(id = null) {
  const x = store.get().investments.find((y) => y.id === id);
  const st = { kind: x?.kind || KINDS[0], color: x?.color || CAT_COLORS[4 + store.get().investments.length % 5] };
  const dyn = () => `<span class="label">Tipo</span><div class="pills wrap mb-3">${KINDS.map((k) => `<button type="button" class="pill" data-kind="${esc(k)}" aria-pressed="${st.kind === k}">${esc(k)}</button>`).join('')}</div>
    <span class="label">Cor</span><div class="pills wrap">${colorPicks(CAT_COLORS, st.color)}</div>`;
  openSheet({
    title: x ? 'Editar investimento' : 'Novo investimento',
    body: `<label class="field"><span>Nome</span><input class="input" id="if-name" maxlength="80" placeholder="Ex.: CDB banco X, Tesouro Selic" value="${esc(x?.name || '')}" ${x ? '' : 'autofocus'}></label>
      ${x ? '' : '<label class="field"><span>Saldo atual (opcional)</span><input class="input money" id="if-bal"></label>'}
      <div id="if-dyn">${dyn()}</div>`,
    foot: `<div class="btn-row">${x ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir"><i class="fas fa-trash"></i></button>' : ''}<button type="button" class="btn primary" data-save>Salvar</button></div>`,
    onMount(el, api) {
      const bal = x ? null : attachMoneyMask(el.querySelector('#if-bal'), 0);
      const re = () => { el.querySelector('#if-dyn').innerHTML = dyn(); };
      bindFreeColor(el, (c) => { st.color = c; re(); });
      el.addEventListener('click', async (e) => {
        const k = e.target.closest('[data-kind]'); if (k) { st.kind = k.dataset.kind; re(); }
        const c = e.target.closest('[data-color]'); if (c) { st.color = c.dataset.color; re(); }
        if (e.target.closest('[data-save]')) {
          const name = el.querySelector('#if-name').value.trim();
          if (!name) { toast('Dê um nome ao investimento'); return; }
          store.commit((s) => {
            const cur = s.investments.find((y) => y.id === id);
            if (cur) Object.assign(cur, { name, ...st });
            else s.investments.push({ id: uid('inv'), name, ...st, entries: bal?.get() > 0 ? [{ id: uid('m'), date: todayISO(), type: 'aporte', amount: bal.get(), note: 'Saldo inicial' }] : [] });
          });
          api.close(); toast('Investimento salvo');
        }
        if (e.target.closest('[data-del]')) {
          api.close();
          if (await confirmSheet({ title: `Excluir “${x.name}”?`, text: 'Todo o histórico deste investimento some.', confirm: 'Excluir', danger: true })) store.commit((s) => { s.investments = s.investments.filter((y) => y.id !== id); });
        }
      });
    },
  });
}

function openInvDetail(id) {
  let type = 'aporte', loss = false;
  const body = (x) => {
    const b = invBalance(x), inv = invInvested(x), y = invYield(x);
    return `<div class="grid-2 mb-3"><div class="stat"><span>Saldo</span><b class="num">${m(b)}</b></div><div class="stat"><span>Rendeu</span><b class="num ${y < 0 ? 'neg' : 'pos'}">${m(y)} <small class="tiny">${pct(y, inv)}</small></b></div></div>
      <div class="segmented mb-3" id="id-type">${[...Object.entries(TYPES), ['saldo', 'Saldo atual']].map(([k, n]) => `<button type="button" data-type="${k}" aria-pressed="${type === k}">${n}</button>`).join('')}</div>
      <label class="field"><span>${type === 'saldo' ? 'Quanto tem hoje (o app calcula o rendimento)' : 'Valor'}</span><input class="input money" id="id-val"></label>
      ${type === 'rendimento' ? `<div class="setting-row mb-2"><div><b>Foi perda</b><small>Rendimento negativo</small></div><button type="button" class="toggle" role="switch" data-loss aria-checked="${loss}" aria-label="Foi perda"></button></div>` : ''}
      <label class="field"><span>Data</span><input class="input" type="date" id="id-date" value="${todayISO()}"></label>
      <button type="button" class="btn primary block mb-3" data-add><i class="fas fa-check"></i>Registrar</button>
      <span class="label">Histórico</span>
      ${x.entries.length ? `<div class="list">${[...x.entries].sort((a, b2) => b2.date.localeCompare(a.date)).map((e) => `<div class="list-row" style="min-height:52px">
        <div class="list-row__main"><div class="list-row__title">${TYPES[e.type]}</div><div class="list-row__meta">${esc(shortDate(e.date))}${e.note ? ` · ${esc(e.note)}` : ''}</div></div>
        <div class="list-row__value ${signed(e) < 0 ? 'neg' : 'pos'}">${signed(e) < 0 ? '−' : '+'}${m(Math.abs(signed(e)))}</div>
        <button type="button" class="icon-btn sm danger" data-undo="${esc(e.id)}" aria-label="Apagar"><i class="fas fa-xmark"></i></button></div>`).join('')}</div>` : '<p class="small muted">Sem movimentos.</p>'}`;
  };
  const x0 = store.get().investments.find((y) => y.id === id);
  openSheet({
    title: x0.name, body: body(x0),
    foot: '<button type="button" class="btn ghost block" data-edit><i class="fas fa-pen"></i>Editar</button>',
    onMount(el, api) {
      let money;
      const refresh = () => { api.setBody(body(store.get().investments.find((y) => y.id === id))); money = attachMoneyMask(el.querySelector('#id-val'), 0); };
      money = attachMoneyMask(el.querySelector('#id-val'), 0);
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-edit]')) { api.close(); openInvForm(id); return; }
        const t = e.target.closest('[data-type]'); if (t) { type = t.dataset.type; refresh(); return; }
        if (e.target.closest('[data-loss]')) { loss = !loss; e.target.closest('[data-loss]').setAttribute('aria-checked', loss); return; }
        const undo = e.target.closest('[data-undo]');
        if (undo) { store.commit((s) => { const x = s.investments.find((y) => y.id === id); x.entries = x.entries.filter((q) => q.id !== undo.dataset.undo); }); refresh(); return; }
        if (!e.target.closest('[data-add]')) return;
        const v = money.get(), date = el.querySelector('#id-date').value;
        if (type !== 'saldo' && !(v > 0)) { toast('Digite o valor'); return; }
        store.commit((s) => {
          const x = s.investments.find((y) => y.id === id);
          const dt = isISO(date) ? date : todayISO();
          if (type === 'saldo') {
            const diff = v - invBalance(x, dt);
            if (diff) x.entries.push({ id: uid('m'), date: dt, type: 'rendimento', amount: diff, note: 'pelo saldo informado' });
          } else x.entries.push({ id: uid('m'), date: dt, type, amount: type === 'rendimento' && loss ? -v : v, note: '' });
        });
        loss = false; refresh(); toast('Registrado');
      });
    },
  });
}

export const investmentsTab = {
  title: 'Investimentos', icon: 'fa-seedling',
  render(d) {
    const total = d.investments.reduce((s, x) => s + invBalance(x), 0);
    const yieldT = d.investments.reduce((s, x) => s + invYield(x), 0);
    const investedT = d.investments.reduce((s, x) => s + invInvested(x), 0);
    const ym = currentYM();
    const series = Array.from({ length: 6 }, (_, i) => shiftYM(ym, i - 5)).map((k) => ({ label: shortYM(k), value: d.investments.reduce((s, x) => s + invBalance(x, `${k}-31`), 0), isCurrent: k === ym }));
    return `<div class="grid-2 mb-3"><div class="stat"><span>Total investido</span><b class="num">${m(total)}</b></div>
        <div class="stat"><span>Rendimento</span><b class="num ${yieldT < 0 ? 'neg' : 'pos'}">${m(yieldT)} <small class="tiny">${pct(yieldT, investedT)}</small></b></div></div>
      ${d.investments.length ? `<section class="card mb-3">${line(series)}<p class="tiny subtle mt-2">Saldo somado no fim de cada mês.</p></section>
        <div class="list">${d.investments.map((x) => `<div class="list-row tap" role="button" tabindex="0" data-act="inv-open" data-id="${esc(x.id)}">
          ${chip(x.color, 'fa-seedling')}<div class="list-row__main"><div class="list-row__title">${esc(x.name)}</div><div class="list-row__meta">${esc(x.kind)} · rendeu ${esc(pct(invYield(x), invInvested(x)))}</div></div>
          <div class="list-row__value">${m(invBalance(x))}</div></div>`).join('')}</div>`
        : `<div class="card">${emptyState('sprout', 'Nenhum investimento', 'Registre aportes e o rendimento que você vê no seu banco. Nada de cotação automática: os números são seus.')}</div>`}
      <button type="button" class="btn primary block mt-4" data-act="inv-new"><i class="fas fa-plus"></i>Novo investimento</button>`;
  },
  actions: {
    'inv-new': () => openInvForm(),
    'inv-open': (el) => openInvDetail(el.dataset.id),
  },
};

