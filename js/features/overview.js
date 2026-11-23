// Resumo do mês — a "Visão Geral" do AeroSync: saldo livre, faturas por cartão, categorias, rosca, padrões.

import { esc, safeColor } from '../core/dom.js';
import { m } from '../core/money.js';
import { formatYM, shiftYM, shortYM, shortDate, monthName } from '../core/dates.js';
import * as F from '../core/finance.js';
import { monthBar, chip, sectionHead } from '../ui/parts.js';
import { donut, catBars } from '../ui/charts.js';
import { emptyState } from '../ui/illustrations.js';
import { filterBar, openFilters } from './purchases.js';

const PERIODS = [['Madrugada', 0, 6], ['Manhã', 6, 12], ['Tarde', 12, 18], ['Noite', 18, 24]];

export default {
  id: 'resumo',
  title: 'Resumo do mês',
  render({ d, ui }) {
    const ym = ui.ym, f = ui.filter;
    const list = F.monthExpenses(d, ym, { filter: f });
    const spent = F.sum(list);
    const prev = F.spent(d, shiftYM(ym, -1), f);
    const diff = prev ? Math.round(((spent - prev) / prev) * 100) : null;
    const cats = F.byCategory(d, list);
    const free = F.available(d, ym) - F.spent(d, ym);

    const periods = PERIODS.map(([name, a, b]) => ({ name, v: F.sum(list.filter((e) => { const h = parseInt(e.time, 10); return h >= a && h < b; })) })).sort((x, y) => y.v - x.v);
    const byDay = {};
    list.forEach((e) => { byDay[e.purchaseDate] = (byDay[e.purchaseDate] || 0) + e.amount; });
    const peak = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

    const pay = [...d.cards.map((c) => ({ ...c, icon: 'fa-credit-card', sum: F.sum(list.filter((e) => e.cardId === c.id)) })),
      { ...F.PIX, active: true, sum: F.sum(list.filter((e) => e.cardId === 'pix')), closingDay: null }];

    return `${monthBar(ym)}${filterBar(d, f)}
      <section class="hero">
        <div class="hero__label">Saldo livre em ${esc(formatYM(ym).toLowerCase())}</div>
        <div class="hero__value num">${m(free)}</div>
        <div class="hero__grid">
          <div class="hero__kv"><span>Salário ${d.salary.usable ? '' : '(desligado)'}</span><b>${m(F.salaryFor(d, ym))}</b></div>
          <div class="hero__kv"><span>Entradas extras</span><b>${m(F.sum(F.extraIncomes(d, ym)))}</b></div>
          <div class="hero__kv"><span>Contas de uso livre</span><b>${m(F.usableBanks(d))}</b></div>
          <div class="hero__kv"><span>Faturas e gastos</span><b>${m(F.spent(d, ym))}</b></div>
        </div>
        <p class="tiny mt-3" style="opacity:.85">Patrimônio guardado: ${m(F.totalBanks(d))}</p>
      </section>

      ${sectionHead('Faturas e Pix do mês', '<a class="link-btn" href="#/cartoes">Cartões</a>')}
      <div class="list">${pay.map((p) => `
        <div class="list-row ${p.active ? '' : 'is-off'}">
          ${chip(p.color, p.icon)}
          <div class="list-row__main"><div class="list-row__title">${esc(p.name)}${p.active ? '' : ' <span class="badge">fora da conta</span>'}</div>
            <div class="list-row__meta">${p.closingDay ? `Fecha dia ${p.closingDay} · vence dia ${p.dueDay}` : 'Descontado no mês da compra'}</div></div>
          <div class="list-row__value">${m(p.sum)}</div>
        </div>`).join('')}</div>

      ${sectionHead('Por categoria')}
      ${list.length ? `<section class="card">${donut(cats, spent)}<div class="divider"></div>${catBars(cats)}</section>`
        : `<div class="card">${emptyState('tea', 'Sem gastos neste mês', 'Quando houver compras, a rosca por categoria aparece aqui.')}</div>`}

      ${list.length ? `${sectionHead('Padrões do mês')}
      <section class="card">
        <div class="kv"><span><i class="fas fa-clock" style="color:var(--ui-accent)"></i> Período em que mais gastou</span><b>${periods[0].v ? `${periods[0].name} · ${m(periods[0].v)}` : '—'}</b></div>
        <div class="kv"><span><i class="fas fa-calendar-day" style="color:var(--ui-accent)"></i> Dia de pico</span><b>${peak ? `${esc(shortDate(peak[0]))} · ${m(peak[1])}` : '—'}</b></div>
        <div class="kv"><span><i class="fas fa-receipt" style="color:var(--ui-accent)"></i> Média por compra</span><b>${m(Math.round(spent / list.length))}</b></div>
        <div class="kv"><span><i class="fas fa-scale-balanced" style="color:var(--ui-accent)"></i> Em relação a ${esc(shortYM(shiftYM(ym, -1)))}</span>
          <b>${diff === null ? 'sem base' : `<span class="${diff > 0 ? 'neg' : 'pos'}">${diff > 0 ? '+' : ''}${diff}%</span>`}</b></div>
      </section>` : ''}`;
  },
  actions: {
    'open-filters': (_, { d, ui, rerender }) => openFilters(d, ui, rerender),
  },
};
