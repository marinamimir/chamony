// Salário (valor base + ajuste por mês) e entradas extras.

import * as store from '../store.js';
import { esc, uid } from '../core/dom.js';
import { m, attachMoneyMask } from '../core/money.js';
import { formatYM, monthName, todayISO, currentYM, shortDate, isISO, shiftYM, shortYM } from '../core/dates.js';
import * as F from '../core/finance.js';
import { monthBar, toggle, sectionHead, chip } from '../ui/parts.js';
import { vbars } from '../ui/charts.js';
import { emptyState } from '../ui/illustrations.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

function openSalarySheet(ym) {
  const d = store.get();
  const has = F.hasSalaryOverride(d, ym);
  openSheet({
    title: 'Salário',
    body: `<label class="field"><span>Salário fixo (todo mês)</span><input class="input money" id="sal-base"></label>
      <label class="field"><span>Valor só em ${esc(formatYM(ym).toLowerCase())} (opcional)</span><input class="input" id="sal-month"></label>
      <p class="tiny subtle">Use o valor do mês quando o salário variar (férias, 13º, desconto). Deixe R$ 0,00 para usar o fixo.</p>`,
    foot: '<button type="button" class="btn primary block" data-save>Salvar</button>',
    onMount(el, api) {
      const base = attachMoneyMask(el.querySelector('#sal-base'), d.salary.base);
      const month = attachMoneyMask(el.querySelector('#sal-month'), has ? d.salary.overrides[ym] : 0);
      el.querySelector('[data-save]').addEventListener('click', () => {
        store.commit((s) => {
          s.salary.base = base.get();
          if (month.get() > 0) s.salary.overrides[ym] = month.get(); else delete s.salary.overrides[ym];
        });
        api.close(); toast('Salário salvo');
      });
    },
  });
}

function openIncomeSheet(ym, incomeId = null) {
  const d = store.get();
  const inc = d.incomes.find((x) => x.id === incomeId);
  openSheet({
    title: inc ? 'Editar entrada' : 'Nova entrada extra',
    body: `<label class="field"><span>Valor</span><input class="input money" id="in-val" ${inc ? '' : 'autofocus'}></label>
      <label class="field"><span>Descrição</span><input class="input" id="in-desc" maxlength="120" placeholder="Ex.: freela, reembolso, venda" value="${esc(inc?.desc || '')}"></label>
      <label class="field"><span>Data</span><input class="input" type="date" id="in-date" value="${esc(inc?.date || (ym === currentYM() ? todayISO() : `${ym}-05`))}"></label>`,
    foot: `<div class="btn-row">${inc ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir"><i class="fas fa-trash"></i></button>' : ''}<button type="button" class="btn primary" data-save>Salvar entrada</button></div>`,
    onMount(el, api) {
      const val = attachMoneyMask(el.querySelector('#in-val'), inc?.amount || 0);
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-save]')) {
          const desc = el.querySelector('#in-desc').value.trim() || 'Entrada extra';
          const date = el.querySelector('#in-date').value;
          if (!(val.get() > 0) || !isISO(date)) { toast('Preencha valor e data'); return; }
          store.commit((s) => {
            const cur = s.incomes.find((x) => x.id === incomeId);
            if (cur) Object.assign(cur, { desc, date, amount: val.get() });
            else s.incomes.push({ id: uid('i'), desc, date, amount: val.get(), usable: true });
          });
          api.close(); toast('Entrada salva');
        }
        if (e.target.closest('[data-del]')) {
          const removed = inc;
          store.commit((s) => { s.incomes = s.incomes.filter((x) => x.id !== incomeId); });
          api.close();
          toast('Entrada excluída', { action: { label: 'Desfazer', fn: () => store.commit((s) => { s.incomes.push(removed); }) } });
        }
      });
    },
  });
}

export default {
  id: 'renda',
  title: 'Salário e renda',
  render({ d, ui }) {
    const ym = ui.ym;
    const sal = F.salaryFor(d, ym);
    const has = F.hasSalaryOverride(d, ym);
    const extras = F.extraIncomes(d, ym).sort((a, b) => b.date.localeCompare(a.date));
    const hist = Array.from({ length: 5 }, (_, i) => shiftYM(ym, i - 4)).map((k) => ({ ym: k, label: shortYM(k), value: F.usableIncome(d, k), isCurrent: k === ym }));
    return `${monthBar(ym)}
      <section class="card">
        <div class="row">
          ${chip('#CDEBC5', 'fa-sack-dollar', 'lg')}
          <div class="grow"><div class="label" style="margin:0">Salário em ${esc(monthName(ym).toLowerCase())}</div>
            <div class="strong num" style="font-size:1.35rem">${m(sal)}</div>
            <span class="badge ${has ? 'accent' : ''}">${has ? 'valor deste mês' : 'valor fixo'}</span></div>
          <button type="button" class="btn sm ghost" data-act="edit-salary">Editar</button>
        </div>
        <div class="divider"></div>
        <div class="row"><div class="grow"><b class="small strong">Contar o salário no saldo do mês</b><div class="tiny muted">Desligue se preferir controlar só pelas contas.</div></div>
          ${toggle(d.salary.usable, 'toggle-salary', 'Contar o salário no saldo')}</div>
      </section>
      ${sectionHead(`Entradas extras (${extras.length})`, '<button type="button" class="link-btn" data-act="new-income"><i class="fas fa-plus"></i> Adicionar</button>')}
      ${extras.length ? `<div class="list">${extras.map((i) => `
        <div class="list-row ${i.usable ? '' : 'is-off'}">
          ${chip('#BFE3D0', 'fa-arrow-trend-up')}
          <button type="button" class="list-row__main" data-act="edit-income" data-id="${esc(i.id)}" style="border:0;background:none;text-align:left;padding:0">
            <div class="list-row__title">${esc(i.desc)}</div><div class="list-row__meta">${esc(shortDate(i.date))} · ${i.usable ? 'soma no saldo' : 'não soma'}</div></button>
          <div class="list-row__value pos">+${m(i.amount)}</div>
          ${toggle(i.usable, 'toggle-income', 'Somar no saldo', `data-id="${esc(i.id)}"`)}
        </div>`).join('')}</div>`
        : `<div class="card">${emptyState('sprout', 'Sem entradas extras', 'Freelas, reembolsos e vendas aparecem aqui e entram no saldo do mês.')}</div>`}
      ${sectionHead('Renda dos últimos 5 meses')}
      <section class="card">${vbars(hist, { act: 'pick-month' })}<p class="tiny subtle mt-2">Salário + entradas que somam no saldo. Gastos não entram aqui.</p></section>`;
  },
  actions: {
    'edit-salary': (_, { ui }) => openSalarySheet(ui.ym),
    'toggle-salary': () => store.commit((s) => { s.salary.usable = !s.salary.usable; }),
    'new-income': (_, { ui }) => openIncomeSheet(ui.ym),
    'edit-income': (el, { ui }) => openIncomeSheet(ui.ym, el.dataset.id),
    'toggle-income': (el) => store.commit((s) => { const i = s.incomes.find((x) => x.id === el.dataset.id); if (i) i.usable = !i.usable; }),
  },
};
