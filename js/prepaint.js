// Aplica o tema salvo antes do primeiro desenho (evita piscar). Script clássico e síncrono.
(function () {
  try {
    var t = JSON.parse(localStorage.getItem('chamony.theme') || 'null') || {};
    var r = document.documentElement;
    if (t.palette === 'B') r.dataset.palette = 'B';
    if (t.dark === 'dark' || (t.dark !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) r.classList.add('dark');
    if (t.accent && /^#[0-9a-f]{6}$/i.test(t.accent)) {
      r.style.setProperty('--accent-base', t.accent);
      if (!r.classList.contains('dark')) r.style.setProperty('--theme-accent', t.accent);
    }
    if (t.splash === false) r.classList.add('no-splash');
  } catch (e) { /* sem armazenamento: usa o padrão */ }
})();
