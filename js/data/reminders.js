// Lembretes com notificação do sistema, SEM servidor.
// O app grava a lista de próximos vencimentos no Cache Storage (chamony-data/__lembretes.json);
// o service worker lê essa lista quando o Chrome o acorda (Periodic Background Sync, ~1x/dia,
// só com o app instalado) e também quando o app é aberto. Cada aviso é mostrado uma única vez.

import { upcomingDues } from '../core/finance.js';
import { fmt } from '../core/money.js';
import { addDays, shortDate, inDays } from '../core/dates.js';

export const DATA_CACHE = 'chamony-data';
const REM_URL = './__lembretes.json';
const TAG = 'chamony-lembretes';

const ROUTES = { card: '#/cartoes', bill: '#/recorrentes', sub: '#/metas?aba=assinaturas', debt: '#/metas?aba=dividas' };

export function reminderItems(d) {
  return upcomingDues(d, { horizon: 20 }).map((x) => {
    const warn = x.kind === 'bill' ? (d.bills.find((b) => b.id === x.id)?.warnDays ?? 5) : x.kind === 'sub' ? 2 : d.settings.dueWarnDays;
    return {
      key: `${x.kind}:${x.id}:${x.date}`,
      title: x.kind === 'card' ? `${x.name} vence ${inDays(x.days)}` : `${x.name}: vence ${inDays(x.days)}`,
      // Se a pessoa abre o app com valores escondidos, a notificação também não mostra valores.
      body: `${shortDate(x.date)}${d.settings.hideOnOpen ? '' : ` · ${fmt(x.amount)}`}. Com calma, dá tempo. 🌼`,
      date: x.date,
      notifyOn: addDays(x.date, -warn),
      url: ROUTES[x.kind] || '#/inicio',
    };
  });
}

let timer = null;
/** Grava a lista para o service worker (chamado após cada alteração, com atraso). */
export function scheduleSync(d) {
  clearTimeout(timer);
  timer = setTimeout(() => writeReminders(d).catch(() => {}), 800);
}
export async function writeReminders(d) {
  if (!('caches' in window)) return;
  const c = await caches.open(DATA_CACHE);
  const payload = { enabled: !!d.settings.notifications, items: d.settings.notifications ? reminderItems(d) : [], writtenAt: new Date().toISOString() };
  await c.put(REM_URL, new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } }));
}

export function support() {
  return {
    notifications: 'Notification' in window && 'serviceWorker' in navigator,
    periodic: 'serviceWorker' in navigator && 'PeriodicSyncManager' in window,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    installed: window.matchMedia('(display-mode: standalone)').matches,
  };
}

/** Pede permissão e registra a checagem periódica. Retorna um texto de status. */
export async function enable() {
  if (!support().notifications) return { ok: false, msg: 'Este navegador não mostra notificações.' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, msg: 'Permissão negada. Dá para liberar nas configurações do site, no Chrome.' };
  const reg = await navigator.serviceWorker.ready;
  let periodic = false;
  try {
    if (reg.periodicSync) { await reg.periodicSync.register(TAG, { minInterval: 12 * 60 * 60 * 1000 }); periodic = true; }
  } catch { /* só funciona com o app instalado e a permissão de sincronização em segundo plano */ }
  return { ok: true, periodic, msg: periodic ? 'Ativo: o Android confere os vencimentos cerca de 1 vez por dia.' : 'Ativo ao abrir o app. Instale o ChaMony para receber também em segundo plano.' };
}

export async function disable() {
  try { const reg = await navigator.serviceWorker.ready; await reg.periodicSync?.unregister(TAG); } catch { /* ignore */ }
}

/** Pede ao service worker para conferir agora (ex.: ao abrir o app). */
export async function checkNow() {
  if (!('serviceWorker' in navigator) || Notification?.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage('check-reminders');
}

export async function testNotification() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('ChaMony 🌼', { body: 'Assim chegam os lembretes de vencimento.', icon: 'icons/icon-192.png', badge: 'icons/icon-maskable-192.png', tag: 'teste' });
}

