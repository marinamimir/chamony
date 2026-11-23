// Peças reaproveitadas pelas telas.

import { esc, safeColor, safeIcon } from '../core/dom.js';
import { m } from '../core/money.js';
import { formatYM, shortDate, currentYM } from '../core/dates.js';
import { resolveCat, payMethod } from '../core/finance.js';

export const chip = (color, icon, cls = '') =>
  `<span class="chip-ico ${cls}" style="--c:${safeColor(color)}"><i class="fas ${safeIcon(icon)}"></i></span>`;

export function monthBar(ym) {
  const isNow = ym === currentYM();
  return `<div class="monthbar">
    <button type="button" class="icon-btn filled" data-act="month-prev" aria-label="Mês anterior"><i class="fas fa-chevron-left"></i></button>
    <button type="button" class="monthbar__label link-btn" data-act="month-today" style="color:inherit">
      ${esc(formatYM(ym))}<small>${isNow ? 'mês atual' : 'toque para voltar ao mês atual'}</small></button>
    <button type="button" class="icon-btn filled" data-act="month-next" aria-label="Próximo mês"><i class="fas fa-chevron-right"></i></button>
  </div>`;
}

/** Linha de compra. opts: { bulk, selected, showDate, trash } */
export function expenseRow(d, e, opts = {}) {
  const cat = resolveCat(d, e);
  const pay = payMethod(d, e.cardId);
  const gid = e.groupId || e.id;
  const inst = e.instTotal > 1 ? `<span class="badge">${e.instIndex}/${e.instTotal}</span> ` : '';
  const rec = e.recurring ? '<span class="badge accent"><i class="fas fa-rotate"></i></span> ' : '';
  const meta = [opts.showDate ? shortDate(e.purchaseDate) : e.time, pay.name, cat.name].filter(Boolean).map(esc).join(' · ');
  const act = opts.trash ? '' : opts.bulk ? 'data-act="bulk-toggle"' : 'data-act="edit-expense"';
  return `<div class="list-row ${opts.trash ? 'is-trash' : 'tap'} ${opts.selected ? 'is-selected' : ''}" ${act} data-gid="${esc(gid)}" data-id="${esc(e.id)}" ${opts.trash ? '' : 'role="button" tabindex="0"'}>
    ${opts.bulk ? '<span class="select-dot"><i class="fas fa-check"></i></span>' : ''}
    ${chip(cat.color, cat.icon)}
    <div class="list-row__main">
      <div class="list-row__title">${esc(e.desc)}</div>
      <div class="list-row__meta">${inst}${rec}${meta}</div>
    </div>
    <div class="list-row__value">${m(e.amount)}</div>
    ${opts.trailing || ''}
  </div>`;
}

export const toggle = (on, act, label, extra = '') =>
  `<button type="button" class="toggle" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}" ${extra}></button>`;

export const seg = (name, options, value) =>
  `<div class="segmented" role="group">${options.map(([v, label]) =>
    `<button type="button" data-act="seg" data-name="${esc(name)}" data-value="${esc(v)}" aria-pressed="${v === value}">${esc(label)}</button>`).join('')}</div>`;

export const sectionHead = (title, right = '') => `<div class="section-head"><h2>${esc(title)}</h2>${right}</div>`;
