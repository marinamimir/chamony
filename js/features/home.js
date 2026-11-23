// Início: saldo livre, anel do limite, próximos vencimentos, últimos gastos, comparação com o mês passado.
// Serve três momentos: registrar rápido (+), ver o mês, planejar.

import { esc, plural } from '../core/dom.js';
import { m } from '../core/money.js';
import { currentYM, shiftYM, monthName, inDays, shortDate } from '../core/dates.js';

const TODAY_FMT = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
import * as F from '../core/finance.js';
import { ring, catBars } from '../ui/charts.js';
import { chip, expenseRow, sectionHead } from '../ui/parts.js';
import { freePhrase, limitPhrase, greeting } from '../ui/tone.js';
import { emptyState, heroFlower } from '../ui/illustrations.js';
import { openLimitSheet } from './budget.js';

function heroCard(d, ym, tone) {
  const free = F.freeBalance(d, ym);
  const spentNow = F.spent(d, ym);
  return `<section class="hero">
    ${heroFlower}
    <div class="hero__label">Saldo livre de ${esc(monthName(ym).toLowerCase())}</div>
    <div class="hero__value num">${m(free)}</div>
    <p class="hero__phrase">${freePhrase(tone, free)}</p>
    <div class="hero__grid">
      <div class="hero__kv"><span>Entradas + contas</span><b>${m(F.available(d, ym))}</b></div>
      <div class="hero__kv"><span>Gastos e faturas</span><b>${m(spentNow)}</b></div>
    </div>
  </section>`;
}

function limitCard(d, ym, tone) {
  const limit = d.budget.monthlyLimit;
  if (!limit) {
    return `<section class="card row">
      ${chip('#F5CF7A', 'fa-bullseye', 'lg')}
      <div class="grow"><div class="card-title">Defina um limite para o mês</div><p class="small muted">Um anel mostra quanto já foi usado, sem susto.</p></div>
      <button type="button" class="btn sm primary" data-act="set-limit">Definir</button>
    </section>`;
  }
  const s = F.spent(d, ym);
  const ratio = s / limit;
  return `<section class="card">
    <div class="ring-wrap">
      ${ring(ratio, { label: 'Limite usado' })}
      <div class="grow">
        <div class="label" style="margin:0 0 4px">Limite do mês</div>
        <div class="strong num" style="font-size:1.25rem">${m(s)} <span class="small subtle">de ${m(limit)}</span></div>
        <p class="small muted mt-2">${esc(limitPhrase(tone, ratio))} ${ratio < 1 ? `Restam ${m(limit - s)}.` : ''}</p>
        <button type="button" class="link-btn" data-act="set-limit" style="padding-left:0">Ajustar limite</button>
      </div>
    </div>
  </section>`;
}

function duesCard(d) {
  const dues = F.upcomingDues(d, { horizon: 20 });
  if (!dues.length) {
    return `<section class="card soft row"><i class="fas fa-mug-hot" style="color:var(--ui-accent)"></i><p class="small muted grow">Nenhum vencimento nos próximos 20 dias. Aproveite o chá.</p></section>`;
  }
  return `<div class="list">${dues.slice(0, 4).map((x) => `
    <a class="list-row tap" href="${x.kind === 'card' ? '#/cartoes' : '#/recorrentes'}" style="text-decoration:none">
      ${chip(x.color, x.icon)}
      <div class="list-row__main"><div class="list-row__title">${esc(x.name)}</div>
        <div class="list-row__meta">${esc(shortDate(x.date))} · ${esc(inDays(x.days))}</div></div>
      <div class="list-row__value">${m(x.amount)}${x.warn ? '<div><span class="badge warn">em breve</span></div>' : ''}</div>
    </a>`).join('')}</div>`;
}

function compareCard(d, ym) {
  const prev = shiftYM(ym, -1);
  const now = F.spent(d, ym), before = F.spent(d, prev);
  const today = new Date().getDate();
  // Comparação justa: até o mesmo dia do mês passado (quando é o mês atual).
  const prevSamePeriod = ym === currentYM()
    ? F.sum(F.monthExpenses(d, prev).filter((e) => Number(e.purchaseDate.slice(8, 10)) <= today || e.purchaseDate.slice(0, 7) !== prev))
    : before;
  const diff = prevSamePeriod ? (now - prevSamePeriod) / prevSamePeriod : 0;
  const down = now <= prevSamePeriod;
  const max = Math.max(now, before, 1);
  return `<section class="card">
    <div class="row" style="align-items:flex-start">
      <div class="grow">
        <div class="label" style="margin:0 0 4px">Comparado a ${esc(monthName(prev).toLowerCase())}</div>
        ${prevSamePeriod
          ? `<div class="strong" style="font-size:1.05rem">${down ? '<i class="fas fa-arrow-trend-down pos"></i>' : '<i class="fas fa-arrow-trend-up" style="color:var(--ui-warning)"></i>'}
             ${Math.abs(Math.round(diff * 100))}% ${down ? 'a menos' : 'a mais'}</div>
             <p class="small muted">${ym === currentYM() ? 'até este mesmo dia do mês' : 'no mês inteiro'}</p>`
          : '<p class="small muted">Ainda sem base no mês passado.</p>'}
      </div>
      <a href="#/comparativo" class="link-btn">Ver mais</a>
    </div>
    <div class="mt-3 stack" style="--gap:6px">
      <div><div class="cat-row__top"><span>${esc(monthName(ym))}</span>${m(now)}</div><div class="bar"><i style="width:${(now / max) * 100}%"></i></div></div>
      <div><div class="cat-row__top"><span class="muted">${esc(monthName(prev))}</span>${m(before)}</div><div class="bar"><i style="width:${(before / max) * 100}%;--c:var(--theme-accent-2)"></i></div></div>
    </div>
  </section>`;
}

function recentList(d) {
  const recent = [...d.expenses].filter((e) => e.instIndex === 1)
    .sort((a, b) => (b.purchaseDate + b.time).localeCompare(a.purchaseDate + a.time)).slice(0, 5);
  if (!recent.length) {
    return `<div class="card">${emptyState('tea', 'Nenhum gasto ainda', 'Toque no <b>+</b> para registrar o primeiro. Leva só alguns segundos.',
      '<button type="button" class="btn primary" data-act="add-expense"><i class="fas fa-plus"></i>Registrar gasto</button>')}</div>`;
  }
  return `<div class="list">${recent.map((e) => {
    const rows = F.groupRows(d.expenses, e.groupId);
    return expenseRow(d, { ...e, amount: F.groupTotal(rows) }, { showDate: true });
  }).join('')}</div>`;
}

export default {
  id: 'inicio',
  title: 'Início',
  render({ d, ui }) {
    const ym = currentYM();
    const tone = d.settings.tone;
    const airy = d.settings.layout === 'airy' && !ui.homeExpanded;
    const firstRun = !d.expenses.length && !d.salary.base && !d.cards.length;
    const dsw = F.daysWithoutSpending(d);
    const cats = F.byCategory(d, F.monthExpenses(d, ym));

    const welcome = firstRun ? `<section class="card soft mb-3">
      <div class="row" style="align-items:flex-start">${chip('#F9C5D1', 'fa-seedling', 'lg')}
        <div class="grow"><div class="card-title">Boas-vindas ao ChaMony</div>
          <p class="small muted">Comece cadastrando seu salário e seus cartões, ou traga tudo do AeroSync.</p>
          <div class="row wrap mt-3">
            <a class="btn sm primary" href="#/renda">Salário</a><a class="btn sm ghost" href="#/cartoes">Cartões</a>
            <a class="btn sm ghost" href="#/ajustes?importar">Importar do AeroSync</a></div></div></div>
    </section>` : '';

    const head = `<div class="row mb-3" style="justify-content:space-between">
      <p class="small muted">${esc(greeting(tone))}! ${esc(TODAY_FMT.format(new Date()))}</p>
      ${dsw !== null && dsw > 0 ? `<span class="badge ok"><i class="fas fa-leaf"></i>${plural(dsw, 'dia', 'dias')} sem gastar</span>` : ''}
    </div>`;

    if (airy) {
      return `${welcome}${heroCard(d, ym, tone)}
        <div class="mt-3">${limitCard(d, ym, tone)}</div>
        <div class="btn-row mt-4">
          <button type="button" class="btn primary" data-act="add-expense"><i class="fas fa-plus"></i>Registrar gasto</button>
          <button type="button" class="btn ghost" data-act="home-expand">Ver o mês</button>
        </div>`;
    }

    return `${welcome}${head}
      <div class="grid-cards two">
        <div class="span-2">${heroCard(d, ym, tone)}</div>
        ${limitCard(d, ym, tone)}
        ${compareCard(d, ym)}
      </div>
      ${sectionHead('Próximos vencimentos', '<a class="link-btn" href="#/cartoes">Cartões</a>')}
      ${duesCard(d)}
      ${sectionHead('Últimos gastos', '<a class="link-btn" href="#/compras">Ver todos</a>')}
      ${recentList(d)}
      ${cats.length ? `${sectionHead(`Onde foi o dinheiro em ${monthName(ym).toLowerCase()}`, '<a class="link-btn" href="#/resumo">Resumo</a>')}
        <section class="card">${catBars(cats, { limit: 4 })}</section>` : ''}
      ${d.settings.layout === 'airy' ? '<div class="center mt-4"><button type="button" class="btn ghost sm" data-act="home-collapse">Voltar à tela respirada</button></div>' : ''}`;
  },
  actions: {
    'set-limit': () => openLimitSheet(),
    'home-expand': (_, { ui, rerender }) => { ui.homeExpanded = true; rerender(); },
    'home-collapse': (_, { ui, rerender }) => { ui.homeExpanded = false; rerender(); window.scrollTo(0, 0); },
  },
};
