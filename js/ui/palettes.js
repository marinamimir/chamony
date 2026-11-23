// Paletas prontas e derivação de cores (claro e escuro) a partir de poucas cores-base.
// Uma paleta própria guarda só: destaque, fundo, superfície (cartões) e ícones. O resto é derivado.

export const PRESETS = [
  { id: 'camomila', name: 'Camomila', desc: 'Azul-acinzentado e rosa (AeroSync)', accent: '#7484A0', accent2: '#C7D0E0', soft: '#EEF1F8', page: '#FBEFF2', page2: '#F3EEF8', surface: '#FFFDFD', warm: '#F6C9D3' },
  { id: 'manteiga', name: 'Manteiga', desc: 'Manteiga, sálvia e creme', accent: '#7A9672', accent2: '#F3DC8C', soft: '#F1F4E8', page: '#FBF5E6', page2: '#F1F2E3', surface: '#FFFEF9', warm: '#F6E3A1' },
  { id: 'lavanda', name: 'Lavanda', desc: 'Lilás calmo', accent: '#8C7FBF', accent2: '#D8CFF2', page: '#F5F1FB', surface: '#FFFEFF', warm: '#EAD9F5' },
  { id: 'pessego', name: 'Pêssego', desc: 'Pêssego e coral suave', accent: '#CF8571', accent2: '#FFD9C7', page: '#FDF2EC', surface: '#FFFDFB', warm: '#FFE1CF' },
  { id: 'menta', name: 'Menta', desc: 'Verde-água fresquinho', accent: '#5E9E8A', accent2: '#BFE3D4', page: '#EEF7F3', surface: '#FCFFFD', warm: '#D7EFE6' },
  { id: 'ceu', name: 'Céu', desc: 'Azul de manhã clara', accent: '#5F8DBF', accent2: '#C6DDF3', page: '#EEF4FB', surface: '#FDFEFF', warm: '#D6E6F7' },
  { id: 'rose', name: 'Rosé', desc: 'Rosa antigo', accent: '#C27795', accent2: '#F3C9D8', page: '#FBEFF3', surface: '#FFFDFE', warm: '#F7D3DF' },
  { id: 'noite', name: 'Noite rosada', desc: 'Ameixa e malva (ótima no escuro)', accent: '#8A6F9E', accent2: '#E3CFE6', page: '#F1ECF3', surface: '#FFFDFF', warm: '#EBD3E4', darkPage: '#17121C', darkSurface: '#221B2A' },
];

const mix = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Texto legível sobre o destaque. */
export const onColor = (hex) => (luminance(hex) > 0.42 ? '#2B3040' : '#FFFFFF');

/** Encontra a paleta ativa (pronta ou própria). */
export function resolvePalette(theme) {
  if (theme.preset?.startsWith('custom:')) {
    const c = theme.customs.find((x) => `custom:${x.id}` === theme.preset);
    if (c) return { ...c, custom: true };
  }
  return PRESETS.find((p) => p.id === theme.preset) || PRESETS[0];
}

/** Variáveis CSS do modo claro e do escuro para uma paleta. */
export function paletteVars(p) {
  const icon = p.icon || null;
  const light = {
    '--theme-accent': p.accent,
    '--theme-accent-2': p.accent2 || mix(p.accent, 35, 'white'),
    '--theme-soft': p.soft || mix(p.accent, 8, p.surface),
    '--theme-glow': mix(p.accent, 32, 'transparent'),
    '--on-accent': onColor(p.accent),
    '--surface': p.surface,
    '--page': p.page,
    '--page-2': p.page2 || mix(p.accent, 7, p.page),
    '--warm': p.warm || mix(p.accent, 22, p.page),
    '--ui-icon': icon || 'var(--ui-muted)',
  };
  const dark = {
    '--theme-accent': mix(p.accent, 68, 'white'),
    '--theme-accent-2': mix(p.accent2 || p.accent, 40, '#1E2130'),
    '--theme-soft': mix(p.accent, 12, '#262A3B'),
    '--theme-glow': mix(p.accent, 28, 'transparent'),
    '--on-accent': '#14161F',
    '--surface': p.darkSurface || mix(p.accent, 6, '#1E2130'),
    '--page': p.darkPage || mix(p.accent, 5, '#14161F'),
    '--page-2': mix(p.accent, 10, '#181B27'),
    '--warm': mix(p.accent2 || p.accent, 14, '#14161F'),
    '--ui-icon': icon ? mix(icon, 60, 'white') : 'var(--ui-muted)',
  };
  return { light, dark };
}

/** Cor sólida (hex) do fundo para a barra do sistema (meta theme-color). */
export function metaColor(p, dark) {
  return dark ? (p.darkPage || '#15171F') : p.page;
}
