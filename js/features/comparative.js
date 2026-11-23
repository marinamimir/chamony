// Comparativo: 5 meses (linha suave, barras e rosca acumulada) — como no AeroSync.

import { esc } from '../core/dom.js';
import { m } from '../core/money.js';
import { shortYM, monthName } from '../core/dates.js';
import * as F from '../core/finance.js';
import { monthBar, sectionHead } from '../ui/parts.js';
import { line, vbars, donut } from '../ui/charts.js';
import { filterBar, openFilters } from './purchases.js';

export default {
  id: 'comparativo',
  title: 'Comparativo',
  render({ d, ui }) {
    const f = ui.filter;
    const series = F.monthsSeries(d, ui.ym, 5, f);
    const cur = series.at(-1).spent;
    const avg = Math.round(F.sum(series.slice(0, 4), 'spent') / 4);
    const diff = avg ? Math.round(((cur - avg) / avg) * 100) : null;
    const all = series.flatMap((s) => F.monthExpenses(d, s.ym, { filter: f }));
    const total = F.sum(all);
    return `${monthBar(ui.ym)}${filterBar(d, f)}
      <div class="grid-2">
        <div class="stat"><span>Gasto em ${esc(monthName(ui.ym).toLowerCase())}</span><b class="num">${m(cur)}</b></div>
        <div class="stat"><span>Média dos 4 anteriores</span><b class="num">${m(avg)}</b></div>
      </div>
      ${sectionHead('Tendência', diff === null ? '<span class="badge">base inicial</span>' : `<span class="badge ${diff > 0 ? 'warn' : 'ok'}">${diff > 0 ? '+' : ''}${diff}% vs média</span>`)}
      <section class="card">${line(series.map((s) => ({ label: shortYM(s.ym), value: s.spent, isCurrent: s.isCurrent })), { avg })}
        <p class="tiny subtle mt-2">A linha tracejada é a média dos 4 meses anteriores.</p></section>
      ${sectionHead('Mês a mês')}
      <section class="card">${vbars(series.map((s) => ({ ym: s.ym, label: shortYM(s.ym), value: s.spent, isCurrent: s.isCurrent })), { act: 'pick-month' })}
        <p class="tiny subtle mt-2">Toque numa barra para ver aquele mês.</p></section>
      ${sectionHead('Categorias nos 5 meses')}
      <section class="card">${total ? donut(F.byCategory(d, all), total, { center: '5 meses' }) : '<p class="small muted center">Sem gastos no período.</p>'}</section>`;
  },
  actions: {
    'open-filters': (_, { d, ui, rerender }) => openFilters(d, ui, rerender),
  },
};
