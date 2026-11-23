// Motor de temas: paleta (A/B), cor de destaque personalizada e modo escuro.
// O <head> de index.html aplica o mesmo antes do primeiro desenho para não piscar.

const media = window.matchMedia('(prefers-color-scheme: dark)');
let current = null;

export function applyTheme(settings) {
  current = settings;
  const root = document.documentElement;
  root.dataset.palette = settings.palette;
  const dark = settings.dark === 'dark' || (settings.dark === 'system' && media.matches);
  root.classList.toggle('dark', dark);
  root.style.removeProperty('--theme-accent');
  root.style.removeProperty('--accent-base');
  if (settings.customAccent) {
    root.style.setProperty('--accent-base', settings.customAccent);
    if (!dark) root.style.setProperty('--theme-accent', settings.customAccent);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(root).getPropertyValue('--page').trim() || '#FBEFF2';
  try { localStorage.setItem('chamony.theme', JSON.stringify({ palette: settings.palette, dark: settings.dark, accent: settings.customAccent, splash: settings.splash })); } catch { /* ignore */ }
}

media.addEventListener?.('change', () => { if (current?.dark === 'system') applyTheme(current); });
