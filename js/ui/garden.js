// Jardim de camomilas: cada selo é uma flor aberta, a sequência de dias vira botões e brotos,
// metas batidas trazem borboletas e meses no azul deixam o céu com sol. Posições estáveis (semente fixa).

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const petals = (cx, cy, r) => Array.from({ length: 8 }, (_, i) =>
  `<ellipse cx="${cx}" cy="${(cy - r).toFixed(1)}" rx="${(r * 0.42).toFixed(1)}" ry="${(r * 0.78).toFixed(1)}" transform="rotate(${i * 45} ${cx} ${cy})"/>`).join('');

function flower(x, ground, h, r, delay) {
  const top = ground - h;
  return `<g class="g-flower" style="animation-delay:${delay}ms">
    <path d="M${x} ${ground} Q ${x - 4} ${ground - h / 2} ${x} ${top}" stroke="#9CC596" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M${x} ${ground - h * 0.4} q -10 -4 -12 -12 q 9 1 12 10" fill="#B7DBA9"/>
    <g fill="#FFFFFF" stroke="#EEDFC0" stroke-width=".8">${petals(x, top, r)}</g>
    <circle cx="${x}" cy="${top}" r="${(r * 0.52).toFixed(1)}" fill="#FCE08A" stroke="#E7B453" stroke-width=".8"/>
  </g>`;
}
function bud(x, ground, h, delay) {
  return `<g class="g-flower" style="animation-delay:${delay}ms">
    <path d="M${x} ${ground} L ${x} ${ground - h}" stroke="#9CC596" stroke-width="2" stroke-linecap="round"/>
    <path d="M${x} ${ground - h * 0.45} q 7 -3 9 -9 q -7 0 -9 7" fill="#B7DBA9"/>
    <ellipse cx="${x}" cy="${ground - h - 3}" rx="3.6" ry="5" fill="#FFFDF3" stroke="#E9DDBF" stroke-width=".8"/>
  </g>`;
}
function butterfly(x, y, delay) {
  return `<g class="g-fly" style="animation-delay:${delay}ms" transform="translate(${x} ${y})">
    <ellipse cx="-4" cy="-2" rx="4.5" ry="3.5" fill="#F4A7B9"/><ellipse cx="4" cy="-2" rx="4.5" ry="3.5" fill="#F4A7B9"/>
    <ellipse cx="-3" cy="3" rx="3" ry="2.4" fill="#F9C5D1"/><ellipse cx="3" cy="3" rx="3" ry="2.4" fill="#F9C5D1"/>
    <rect x="-.7" y="-5" width="1.4" height="10" rx=".7" fill="#7A6A80"/></g>`;
}

/** @param {{ flowers:number, buds:number, butterflies:number, sun:boolean }} g */
export function gardenSVG(g, { height = 190 } = {}) {
  const W = 340, H = height, ground = H - 34;
  const rand = rng(7);
  const slots = [];
  const total = Math.min(g.flowers + g.buds, 40);
  for (let i = 0; i < total; i++) slots.push({ x: 18 + ((i * 0.618 * W) % (W - 36)) + (rand() - 0.5) * 10, row: rand() });
  slots.sort((a, b) => a.row - b.row);
  const items = slots.map((s, i) => {
    const gy = ground + 6 + s.row * 18;
    return i < Math.min(g.flowers, 40) ? flower(s.x.toFixed(1), gy, 34 + rand() * 30, 6 + rand() * 4, i * 70) : bud(s.x.toFixed(1), gy, 18 + rand() * 16, i * 70);
  });
  // Flores ficam por trás das da frente: ordenadas pela "linha"
  const flies = Array.from({ length: Math.min(g.butterflies, 5) }, (_, i) => butterfly(40 + i * 62 + rand() * 20, 30 + rand() * 50, 400 + i * 200)).join('');
  return `<svg class="garden" viewBox="0 0 ${W} ${H}" role="img" aria-label="Jardim com ${g.flowers} flores e ${g.buds} brotos">
    <defs>
      <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--theme-soft)"/><stop offset="1" stop-color="var(--ui-surface)"/></linearGradient>
      <linearGradient id="gground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8EDCF"/><stop offset="1" stop-color="#BFDDB2"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" rx="22" fill="url(#gsky)"/>
    ${g.sun ? `<g class="g-sun"><circle cx="${W - 46}" cy="40" r="17" fill="#FCE08A" opacity=".9"/><circle cx="${W - 46}" cy="40" r="26" fill="#FCE08A" opacity=".25"/></g>` : `<g opacity=".7"><ellipse cx="${W - 60}" cy="40" rx="26" ry="10" fill="#FFFFFF"/><ellipse cx="${W - 44}" cy="33" rx="14" ry="10" fill="#FFFFFF"/></g>`}
    <path d="M0 ${ground} Q ${W * 0.3} ${ground - 18} ${W * 0.55} ${ground - 4} T ${W} ${ground - 10} V ${H} H 0 Z" fill="url(#gground)"/>
    ${items.join('')}
    ${flies}
    ${!total ? `<text x="${W / 2}" y="${ground - 30}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ui-muted)">O primeiro registro planta a primeira semente 🌱</text>` : ''}
  </svg>`;
}
