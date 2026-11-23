// Aplica o tema salvo antes do primeiro desenho (evita piscar). Script clássico e síncrono.
(function () {
  try {
    var t = JSON.parse(localStorage.getItem('chamony.theme') || 'null');
    if (!t || !t.light) return;
    var r = document.documentElement;
    var dark = t.mode === 'dark' || (t.mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) r.classList.add('dark');
    var vars = dark ? t.dark : t.light;
    for (var k in vars) if (/^--[a-z0-9-]+$/.test(k)) r.style.setProperty(k, String(vars[k]));
    if (t.bg) r.dataset.bg = t.bg;
    if (t.icons === 'own') r.classList.add('icons-own');
    if (t.splash === false) r.classList.add('no-splash');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && t.meta) meta.content = t.meta[dark ? 1 : 0];
  } catch (e) { /* sem armazenamento: usa o padrão */ }
})();
