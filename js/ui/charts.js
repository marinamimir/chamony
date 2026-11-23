// Gráficos em SVG puro: rosca, anel de limite, barras arredondadas e linha suave com gradiente.
// Mantêm as cores por categoria. Valores ficam com a classe .mt para sumir ao esconder valores.

import { esc, safeColor } from '../core/dom.js';
import { fmt, fmtShort, m } from '../core/money.js';

let gid = 0;
const pctTxt = (p) => `${Math.round(p * 100)}%`;

/** Rosca por categoria. segments: [{ name, color, sum, pct }] */
export function donut(segments, total, { center = 'Total' } = {}) {
  const R = 52, C = 2 * Math.PI * R, GAP = segments.length > 1 ? 2.5 : 0;
  let acc = 0;
  const arcs = segments.filter((s) => s.sum > 0).map((s, i) => {
    const len = Math.max(0, s.pct * C - GAP);
    const arc = `<circle class="donut-seg" cx="70" cy="70" r="${R}" fill="none" stroke="${safeColor(s.color)}" stroke-width="18"
      stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"
      transform="rotate(-90 70 70)" style="animation-delay:${i * 60}ms"><title>${esc(s.name)}: ${fmt(s.sum)}</title></circle>`;
    acc += s.pct * C;
    return arc;
  }).join('');
  return `
  <div class="donut-wrap">
    <svg class="chart" viewBox="0 0 140 140" role="img" aria-label="Gastos por categoria">
      <circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--ui-soft-surface)" stroke-width="18"/>
      ${arcs}
      <text x="70" y="64" text-anchor="middle" font-size="9" style="text-transform:uppercase;letter-spacing:.08em">${esc(center)}</text>
      <text class="strong-t mt" x="70" y="82" text-anchor="middle" font-size="14">${esc(fmtShort(total))}</text>
    </svg>
    <div class="legend">
      ${segments.slice(0, 6).map((s) => `
        <div class="legend__item"><span class="dot" style="--c:${safeColor(s.color)}"></span>
          <span class="grow truncate">${esc(s.name)}</span><span class="subtle">${pctTxt(s.pct)}</span></div>`).join('')}
      ${segments.length > 6 ? `<div class="legend__item subtle">+ ${segments.length - 6} categorias</div>` : ''}
    </div>
  </div>`;
}

/** Anel de progresso (limite do mês). */
export function ring(ratio, { label = '', color } = {}) {
  const R = 46, C = 2 * Math.PI * R;
  const r = Math.max(0, Math.min(1, ratio));
  const c = color || (ratio > 1 ? 'var(--ui-danger)' : ratio >= 0.8 ? 'var(--ui-warning)' : 'var(--ui-success)');
  const id = `rg${++gid}`;
  return `
  <svg class="ring" viewBox="0 0 112 112" role="img" aria-label="${esc(label)} ${pctTxt(ratio)}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c}" stop-opacity=".65"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
    <circle cx="56" cy="56" r="${R}" fill="none" stroke="var(--ui-soft-surface)" stroke-width="12"/>
    <circle cx="56" cy="56" r="${R}" fill="none" stroke="url(#${id})" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - r)).toFixed(2)}" transform="rotate(-90 56 56)"/>
    <text class="strong-t" x="56" y="61" text-anchor="middle" font-size="18">${pctTxt(ratio)}</text>
  </svg>`;
}

/** Barras verticais arredondadas (meses). items: [{ label, value, isCurrent, ym }] */
export function vbars(items, { act } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div class="vbars">${items.map((i, k) => `
    <button type="button" class="vbars__col ${i.isCurrent ? 'is-current' : ''}" ${act ? `data-act="${act}" data-ym="${esc(i.ym)}"` : ''} aria-label="${esc(i.label)}: ${fmt(i.value)}">
      <span class="vbars__val">${m(i.value).replace('R$ ', '')}</span>
      <span class="vbars__bar" style="height:${Math.max(6, (i.value / max) * 100)}%;animation-delay:${k * 50}ms"></span>
      <span class="vbars__lbl">${esc(i.label)}</span>
    </button>`).join('')}</div>`;
}

/** Linha suave com área em gradiente + linha tracejada da média. points: [{ label, value, isCurrent }] */
export function line(points, { avg = null, color = 'var(--ui-accent)' } = {}) {
  const W = 320, H = 130, PX = 22, PY = 22;
  const max = Math.max(1, ...points.map((p) => p.value), avg || 0);
  const step = points.length > 1 ? (W - PX * 2) / (points.length - 1) : 0;
  const pts = points.map((p, i) => ({ ...p, x: PX + i * step, y: H - PY - (p.value / max) * (H - PY * 2) }));
  const d = pts.reduce((acc, p, i) => {
    if (!i) return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1], cx = (prev.x + p.x) / 2;
    return `${acc} C${cx.toFixed(1)} ${prev.y.toFixed(1)},${cx.toFixed(1)} ${p.y.toFixed(1)},${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');
  const area = `${d} L${pts.at(-1).x.toFixed(1)} ${H - PY} L${pts[0].x.toFixed(1)} ${H - PY} Z`;
  const id = `lg${++gid}`;
  const avgY = avg !== null ? H - PY - (avg / max) * (H - PY * 2) : null;
  return `
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução dos gastos">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".34"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${avgY !== null ? `<line x1="${PX}" x2="${W - PX}" y1="${avgY.toFixed(1)}" y2="${avgY.toFixed(1)}" stroke="var(--ui-subtle)" stroke-dasharray="4 5" stroke-width="1.2"/>` : ''}
    <path d="${area}" fill="url(#${id})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    ${pts.map((p) => `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.isCurrent ? 5.5 : 4}" fill="${p.isCurrent ? color : 'var(--ui-surface)'}" stroke="${color}" stroke-width="2.5"/>
      <text class="mt" x="${p.x.toFixed(1)}" y="${(p.y < 34 ? p.y + 17 : p.y - 10).toFixed(1)}" text-anchor="middle" font-size="9">${esc(fmtShort(p.value).replace('R$ ', ''))}</text>
      <text x="${p.x.toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="9.5" ${p.isCurrent ? 'class="strong-t"' : ''}>${esc(p.label)}</text>`).join('')}
  </svg>`;
}

/** Barras horizontais por categoria. */
export function catBars(segments, { limit = 99 } = {}) {
  return segments.slice(0, limit).map((s) => `
    <div class="cat-row">
      <div class="cat-row__top"><span class="truncate"><i class="fas ${esc(s.icon)}" style="color:${safeColor(s.color)};filter:saturate(1.4) brightness(.85)"></i> ${esc(s.name)} <span class="subtle">${pctTxt(s.pct)}</span></span>${m(s.sum)}</div>
      <div class="bar"><i style="width:${Math.max(2, s.pct * 100)}%;--c:${safeColor(s.color)}"></i></div>
    </div>`).join('');
}
