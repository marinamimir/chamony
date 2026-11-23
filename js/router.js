// Roteador por hash: #/rota?param. Funciona em hospedagem estática (GitHub Pages) e offline.

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  return { id: path || 'inicio', query: new URLSearchParams(qs) };
}

export function onRoute(fn) {
  window.addEventListener('hashchange', () => fn(parseHash()));
}

export function go(id) {
  if (location.hash !== `#/${id}`) location.hash = `#/${id}`;
}
