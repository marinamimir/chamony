// Pequenas ilustrações (flores e chá) para estados vazios. SVG inline, cores do tema.

const flower = (cx, cy, r = 14, petal = '#FFFFFF') => {
  const ps = Array.from({ length: 8 }, (_, i) =>
    `<ellipse cx="${cx}" cy="${cy - r}" rx="${r * 0.42}" ry="${r * 0.75}" fill="${petal}" stroke="#EEDFC0" stroke-width="1.2" transform="rotate(${i * 45} ${cx} ${cy})"/>`).join('');
  return `${ps}<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="#FCE08A" stroke="#E7B453" stroke-width="1.2"/>`;
};

const ART = {
  // Xícara de chá com camomila boiando e vapor
  tea: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="102" rx="40" ry="7" fill="var(--ui-soft-surface)"/>
    <path d="M50 30 q-6 -8 0 -16 M62 32 q-6 -8 0 -16 M74 30 q-6 -8 0 -16" fill="none" stroke="var(--ui-subtle)" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
    <path d="M26 46 h64 v14 a32 32 0 0 1 -64 0 z" fill="var(--ui-surface)" stroke="var(--theme-accent-2)" stroke-width="3"/>
    <path d="M90 52 h6 a10 10 0 0 1 0 20 h-8" fill="none" stroke="var(--theme-accent-2)" stroke-width="3"/>
    <ellipse cx="58" cy="47" rx="30" ry="5" fill="#F8E7B5"/>
    <g transform="translate(0 -1)">${flower(58, 47, 7)}</g>
    <ellipse cx="58" cy="95" rx="36" ry="5" fill="none" stroke="var(--theme-accent-2)" stroke-width="3"/>
  </svg>`,
  // Broto com uma flor
  sprout: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="104" rx="36" ry="6" fill="var(--ui-soft-surface)"/>
    <path d="M42 84 h36 l-5 20 h-26 z" fill="var(--theme-accent-2)"/>
    <rect x="38" y="78" width="44" height="9" rx="4" fill="color-mix(in srgb, var(--theme-accent-2) 80%, black)" opacity=".5"/>
    <path d="M60 80 C60 64 58 54 60 40" stroke="#A3C49A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M60 66 C50 62 44 56 44 50 C52 50 58 56 60 64" fill="#BFE3D0"/>
    <path d="M60 60 C70 56 76 50 77 44 C69 44 62 50 60 58" fill="#CDEBC5"/>
    ${flower(60, 32, 13)}
  </svg>`,
  // Jardim (metas — em breve)
  garden: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="102" rx="46" ry="8" fill="var(--ui-soft-surface)"/>
    <path d="M34 100 C34 86 33 78 34 66 M60 100 C60 82 59 70 60 50 M86 100 C86 88 85 80 86 70" stroke="#A3C49A" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${flower(34, 60, 9)}${flower(60, 42, 13)}${flower(86, 64, 8)}
  </svg>`,
  // Cartão com flor
  card: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="102" rx="40" ry="7" fill="var(--ui-soft-surface)"/>
    <rect x="18" y="36" width="84" height="54" rx="12" fill="var(--theme-accent-2)" transform="rotate(-6 60 63)"/>
    <rect x="22" y="40" width="80" height="52" rx="12" fill="var(--ui-surface)" stroke="var(--theme-accent-2)" stroke-width="3"/>
    <rect x="32" y="52" width="16" height="11" rx="3" fill="#FCE08A"/>
    <rect x="32" y="74" width="40" height="5" rx="2.5" fill="var(--ui-soft-surface)"/>
    ${flower(86, 54, 8)}
  </svg>`,
  // Folhas secas (lixeira vazia)
  leaf: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="100" rx="38" ry="7" fill="var(--ui-soft-surface)"/>
    <path d="M40 90 C38 66 56 46 84 42 C86 70 68 90 40 90 Z" fill="#CDEBC5"/>
    <path d="M42 88 C54 74 64 62 80 46" stroke="#A3C49A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${flower(36, 50, 8)}
  </svg>`,
};

export function art(name) { return ART[name] || ART.sprout; }

export function emptyState(name, title, text, action = '') {
  return `<div class="empty">${art(name)}<b>${title}</b><p>${text}</p>${action ? `<div class="mt-3">${action}</div>` : ''}</div>`;
}

/** Flor grande decorativa (fundo do cartão principal). */
export const heroFlower = `<svg class="hero__petal" viewBox="0 0 120 120" aria-hidden="true">${flower(60, 60, 30, '#FFFFFF')}</svg>`;
