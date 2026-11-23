// Motor de temas: paleta (pronta ou própria), fundo do app, modo escuro e conjunto de ícones.
// js/prepaint.js aplica a mesma coisa (a partir do cache `chamony.theme`) antes do primeiro desenho.

import { resolvePalette, paletteVars, metaColor } from './palettes.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');
let current = null;

/** Aplica variáveis de uma paleta (usado também na prévia ao vivo do editor). */
export function applyPalette(palette, dark) {
  const root = document.documentElement;
  const vars = paletteVars(palette)[dark ? 'dark' : 'light'];
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = metaColor(palette, dark);
  return vars;
}

export const isDark = (settings) => settings.dark === 'dark' || (settings.dark === 'system' && media.matches);

export function applyTheme(settings) {
  current = settings;
  const root = document.documentElement;
  const dark = isDark(settings);
  root.classList.toggle('dark', dark);
  root.dataset.bg = settings.theme.bg;
  root.classList.toggle('icons-own', settings.iconSet === 'own');
  const palette = resolvePalette(settings.theme);
  applyPalette(palette, dark);
  try {
    const { light, dark: darkVars } = paletteVars(palette);
    localStorage.setItem('chamony.theme', JSON.stringify({
      mode: settings.dark, light, dark: darkVars, bg: settings.theme.bg, splash: settings.splash,
      icons: settings.iconSet, meta: [metaColor(palette, false), metaColor(palette, true)],
    }));
  } catch { /* sem armazenamento */ }
}

/** Reaplica o tema salvo (ex.: ao cancelar a prévia do editor de paletas). */
export const reapply = () => current && applyTheme(current);

media.addEventListener?.('change', () => { if (current?.dark === 'system') applyTheme(current); });
