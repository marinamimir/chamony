/* ChaMony — service worker (offline).
   - Instalação: guarda todo o app (APP_SHELL) no cache.
   - Navegação: tenta a rede primeiro (pega versão nova) e cai no cache sem internet.
   - Demais arquivos: cache primeiro, atualizando em segundo plano.
   - Nenhum dado financeiro passa por aqui: os dados ficam no localStorage do aparelho.
   Publicou mudança? Suba CACHE_VERSION (e APP_VERSION em js/version.js).
   `node tools/check-sw.mjs` confere se todo arquivo do app está na lista. */
const CACHE_VERSION = 'v0.1.0';
const CACHE = `chamony-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/themes.css',
  './css/base.css',
  './css/components.css',
  './js/prepaint.js',
  './js/app.js',
  './js/version.js',
  './js/store.js',
  './js/router.js',
  './js/nav.js',
  './js/core/dates.js',
  './js/core/dom.js',
  './js/core/finance.js',
  './js/core/money.js',
  './js/data/aerosync.js',
  './js/data/backup.js',
  './js/data/merge.js',
  './js/ui/charts.js',
  './js/ui/feedback.js',
  './js/ui/palettes.js',
  './js/ui/illustrations.js',
  './js/ui/parts.js',
  './js/ui/sheet.js',
  './js/ui/state.js',
  './js/ui/theme.js',
  './js/ui/toast.js',
  './js/ui/tone.js',
  './js/features/appearance.js',
  './js/features/banks.js',
  './js/features/budget.js',
  './js/features/cards.js',
  './js/features/categories.js',
  './js/features/comparative.js',
  './js/features/expense-actions.js',
  './js/features/expense-form.js',
  './js/features/goals.js',
  './js/features/home.js',
  './js/features/income.js',
  './js/features/more.js',
  './js/features/overview.js',
  './js/features/purchases.js',
  './js/features/recurring.js',
  './js/features/settings.js',
  './js/features/simulator.js',
  './js/features/trash.js',
  './js/features/plans/debts.js',
  './js/features/plans/goals.js',
  './js/features/plans/investments.js',
  './js/features/plans/subscriptions.js',
  './js/features/plans/wishes.js',
  './icons/logo.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './vendor/fonts/nunito-latin-wght-normal.woff2',
  './vendor/fonts/nunito-latin-ext-wght-normal.woff2',
  './vendor/fonts/manrope-latin-wght-normal.woff2',
  './vendor/fontawesome/css/fontawesome.min.css',
  './vendor/fontawesome/css/solid.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('chamony-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })),
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
