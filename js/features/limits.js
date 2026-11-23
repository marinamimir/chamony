// Limites por categoria: barras suaves (convivem com o limite geral do mês).
import { esc, safeColor } from '../core/dom.js';
import { m } from '../core/money.js';
import * as F from '../core/finance.js';

/** Lista de { cat, spent, limit, ratio } para o mês, ordenada pelos mais apertados. */
export function categoryLimits(d, ym) {
  const by = F.byCategory(d, F.monthExpenses(d, ym));
  return Object.entries(d.budget.catLimits || {}).map(([id, limit]) => {
    const cat = d.categories.find((c) => c.id === id);
    if (!cat) return null;
    const spent = by.find((x) => x.id === id)?.sum || 0;
    return { cat, spent, limit, ratio: spent / limit };
  }).filter(Boolean).sort((a, b) => b.ratio - a.ratio);
}

export function limitsCard(d, ym, { max = 99 } = {}) {
  const list = categoryLimits(d, ym);
  if (!list.length) return '';
  return `<section class="card">${list.slice(0, max).map(({ cat, spent, limit, ratio }) => `
    <div class="cat-row">
      <div class="cat-row__top"><span class="truncate"><i class="fas ${esc(cat.icon)}" style="color:${safeColor(cat.color)};filter:saturate(1.4) brightness(.85)"></i> ${esc(cat.name)}</span>
        <span>${m(spent)} <span class="subtle">/ ${m(limit)}</span></span></div>
      <div class="bar"><i style="width:${Math.min(100, ratio * 100)}%;--c:${ratio > 1 ? 'var(--ui-danger)' : ratio >= 0.8 ? 'var(--ui-warning)' : safeColor(cat.color)}"></i></div>
      ${ratio > 1 ? `<div class="tiny muted mt-2">Passou ${m(spent - limit)}. Sem culpa: o mês ainda dá para ajustar.</div>` : ratio >= 0.8 ? `<div class="tiny muted mt-2">Restam ${m(limit - spent)}.</div>` : ''}
    </div>`).join('')}</section>`;
}
