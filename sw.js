/* ChaMony — service worker (offline).
   - Instalação: guarda todo o app (APP_SHELL) no cache.
   - Navegação: tenta a rede primeiro (pega versão nova) e cai no cache sem internet.
   - Demais arquivos: cache primeiro, atualizando em segundo plano.
   - Nenhum dado financeiro passa por aqui: os dados ficam no localStorage do aparelho.
   Publicou mudança? Suba CACHE_VERSION (e APP_VERSION em js/version.js).
   `node tools/check-sw.mjs` confere se todo arquivo do app está na lista. */
const CACHE_VERSION = 'v0.3.1';
const CACHE = `chamony-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/themes.css',
  './css/base.css',
  './css/components.css',
  './css/icons-own.css',
  './js/prepaint.js',
  './js/app.js',
  './js/version.js',
  './js/store.js',
  './js/router.js',
  './js/nav.js',
  './js/core/dates.js',
  './js/core/dom.js',
  './js/core/finance.js',
  './js/core/game.js',
  './js/core/money.js',
  './js/data/aerosync.js',
  './js/data/backup.js',
  './js/data/merge.js',
  './js/data/idb.js',
  './js/data/reminders.js',
  './js/ui/charts.js',
  './js/ui/feedback.js',
  './js/ui/garden.js',
  './js/ui/palettes.js',
  './js/ui/illustrations.js',
  './js/ui/parts.js',
  './js/ui/sheet.js',
  './js/ui/state.js',
  './js/ui/theme.js',
  './js/ui/toast.js',
  './js/ui/tone.js',
  './js/features/appearance.js',
  './js/features/achievements.js',
  './js/features/keypad.js',
  './js/features/import.js',
  './js/import/parser.js',
  './js/import/pdf.js',
  './js/import/csv.js',
  './js/import/pipeline.js',
  './js/import/parsers/itau.js',
  './js/import/parsers/nubank.js',
  './vendor/pdfjs/pdf.min.mjs',
  './vendor/pdfjs/pdf.worker.min.mjs',
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
  './js/features/limits.js',
  './js/features/report.js',
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
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('chamony-') && k !== CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
  if (event.data === 'check-reminders') event.waitUntil(checkReminders());
});

// ---------------------------------------------------------------------------
// Lembretes (sem servidor): a lista é gravada pelo app em DATA_CACHE.
// ---------------------------------------------------------------------------
const DATA_CACHE = 'chamony-data';
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function checkReminders() {
  const c = await caches.open(DATA_CACHE);
  const res = await c.match('./__lembretes.json');
  if (!res) return;
  const data = await res.json();
  if (!data.enabled || Notification.permission !== 'granted') return;
  const logRes = await c.match('./__notificados.json');
  const log = logRes ? await logRes.json() : {};
  const today = isoToday();
  for (const it of data.items || []) {
    if (log[it.key] || today < it.notifyOn || today > it.date) continue;
    await self.registration.showNotification(it.title, {
      body: it.body, tag: it.key, icon: 'icons/icon-192.png', badge: 'icons/icon-maskable-192.png', data: { url: it.url },
    });
    log[it.key] = today;
  }
  // Esquece avisos com mais de 60 dias.
  const limit = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  for (const k of Object.keys(log)) if (log[k] < limit) delete log[k];
  await c.put('./__notificados.json', new Response(JSON.stringify(log), { headers: { 'Content-Type': 'application/json' } }));
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'chamony-lembretes') event.waitUntil(checkReminders());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(`./${event.notification.data?.url || ''}`, self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const win = list.find((w) => w.url.startsWith(self.registration.scope));
    if (win) { win.navigate(url).catch(() => {}); return win.focus(); }
    return self.clients.openWindow(url);
  }));
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
