// Relatório mensal: página pronta para imprimir ou "Salvar como PDF" (sem biblioteca: usa a impressão do navegador).

import { esc, safeColor } from '../core/dom.js';
import { m } from '../core/money.js';
import { formatYM, shiftYM, monthName, shortDate } from '../core/dates.js';
import * as F from '../core/finance.js';
import { monthBar } from '../ui/parts.js';
import { donut } from '../ui/charts.js';
import { categoryLimits } from './limits.js';
import { goalSaved } from './plans/goals.js';
import { invBalance } from './plans/investments.js';

const pct = (x) => `${Math.round(x * 100)}%`;

export default {
  id: 'relatorio',
  title: 'Relatório do mês',
  render({ d, ui }) {
    const ym = ui.ym;
    const list = F.monthExpenses(d, ym);
    const spent = F.sum(list), income = F.usableIncome(d, ym), prev = F.spent(d, shiftYM(ym, -1));
    const cats = F.byCategory(d, list);
    const pay = [...d.cards.map((c) => ({ name: c.name, color: c.color, sum: F.invoice(d, c.id, ym) })), { name: 'Pix / Conta', color: '#8FD3B6', sum: F.sum(list.filter((e) => e.cardId === 'pix')) }].filter((p) => p.sum);
    const groups = new Map();
    list.forEach((e) => { const g = groups.get(e.groupId) || { ...e, amount: 0 }; g.amount += e.amount; groups.set(e.groupId, g); });
    const top = [...groups.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
    const limits = categoryLimits(d, ym);
    const invested = d.investments.reduce((s, x) => s + invBalance(x), 0);
    const diff = prev ? (spent - prev) / prev : null;
    const table = (head, rows) => `<table class="rtable"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;

    return `<div class="no-print">${monthBar(ym)}
        <button type="button" class="btn primary block mb-2" data-act="print"><i class="fas fa-file-pdf"></i>Salvar PDF ou imprimir</button>
        <p class="tiny subtle center mb-3">No Android: escolha a impressora <b>“Salvar como PDF”</b>. Nada sai do seu aparelho.</p></div>
      <article class="report card">
        <header class="row report__head"><img src="icons/logo.svg" alt="" width="48" height="48">
          <div class="grow"><div class="report__kicker">Relatório mensal</div><h2 class="report__title">${esc(formatYM(ym))}</h2>
          <div class="tiny muted">ChaMony · gerado em ${esc(new Date().toLocaleDateString('pt-BR'))}</div></div></header>

        <div class="report__kpis">
          <div><span>Entradas</span><b>${m(income)}</b></div>
          <div><span>Gastos e faturas</span><b>${m(spent)}</b></div>
          <div><span>Saldo livre</span><b>${m(F.freeBalance(d, ym))}</b></div>
          <div><span>Guardado + investido</span><b>${m(F.totalBanks(d) + invested)}</b></div>
        </div>
        <p class="small muted">${diff === null ? 'Sem base no mês anterior para comparar.' : `Em relação a ${esc(monthName(shiftYM(ym, -1)).toLowerCase())}: ${diff > 0 ? '+' : ''}${Math.round(diff * 100)}% nos gastos (${m(prev)} antes).`}
          ${d.budget.monthlyLimit ? ` Limite do mês: ${m(d.budget.monthlyLimit)} (${pct(spent / d.budget.monthlyLimit)} usado).` : ''}</p>

        <h3 class="report__h">Por categoria</h3>
        ${cats.length ? `<div class="report__split">${donut(cats, spent)}</div>
          ${table(['Categoria', 'Valor', '%', 'Compras'], cats.map((c) => `<tr><td><span class="dot" style="--c:${safeColor(c.color)}"></span> ${esc(c.name)}</td><td>${m(c.sum)}</td><td>${pct(c.pct)}</td><td>${c.count}</td></tr>`))}` : '<p class="small muted">Sem gastos neste mês.</p>'}

        ${limits.length ? `<h3 class="report__h">Limites por categoria</h3>${table(['Categoria', 'Gasto', 'Limite', 'Uso'], limits.map((l) => `<tr><td>${esc(l.cat.name)}</td><td>${m(l.spent)}</td><td>${m(l.limit)}</td><td>${pct(l.ratio)}</td></tr>`))}` : ''}

        ${pay.length ? `<h3 class="report__h">Por forma de pagamento</h3>${table(['Pagamento', 'Valor'], pay.map((p) => `<tr><td><span class="dot" style="--c:${safeColor(p.color)}"></span> ${esc(p.name)}</td><td>${m(p.sum)}</td></tr>`))}` : ''}

        ${top.length ? `<h3 class="report__h">Maiores compras</h3>${table(['Data', 'Compra', 'Categoria', 'Valor'], top.map((e) => `<tr><td>${esc(shortDate(e.purchaseDate))}</td><td>${esc(e.desc)}${e.instTotal > 1 ? ` <span class="tiny muted">${e.instIndex}/${e.instTotal}</span>` : ''}</td><td>${esc(F.resolveCat(d, e).name)}</td><td>${m(e.amount)}</td></tr>`))}` : ''}

        ${d.goals.length ? `<h3 class="report__h">Metas</h3>${table(['Meta', 'Guardado', 'Alvo', 'Progresso'], d.goals.map((g) => `<tr><td>${esc(g.name)}</td><td>${m(goalSaved(g))}</td><td>${m(g.target)}</td><td>${pct(g.target ? Math.min(1, goalSaved(g) / g.target) : 0)}</td></tr>`))}` : ''}

        <footer class="report__foot">ChaMony · Dinheiro com calma, florescendo a prosperidade. Relatório gerado no próprio aparelho.</footer>
      </article>`;
  },
  actions: {
    print: () => window.print(),
  },
};
