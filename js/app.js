// ChaMony — ponto de entrada. Liga armazenamento, tema, navegação, telas e service worker.

import * as store from './store.js';
import { ui, setHidden } from './ui/state.js';
import { applyTheme } from './ui/theme.js';
import { toast } from './ui/toast.js';
import { parseHash, onRoute, go } from './router.js';
import { renderBottomNav, renderSidebar, markCurrent, MORE_ITEMS } from './nav.js';
import { shiftYM, currentYM } from './core/dates.js';
import { openExpenseForm } from './features/expense-form.js';
import * as reminders from './data/reminders.js';

import inicio from './features/home.js';
import compras from './features/purchases.js';
import cartoes from './features/cards.js';
import metas from './features/goals.js';
import mais from './features/more.js';
import resumo from './features/overview.js';
import comparativo from './features/comparative.js';
import renda from './features/income.js';
import contas from './features/banks.js';
import categorias from './features/categories.js';
import recorrentes from './features/recurring.js';
import simulador from './features/simulator.js';
import lixeira from './features/trash.js';
import ajustes from './features/settings.js';
import relatorio from './features/report.js';
import conquistas, { checkUnlocks } from './features/achievements.js';
import { openQuickAdd } from './features/keypad.js';
import importar from './features/import.js';
import { feedback } from './ui/feedback.js';

const VIEWS = { inicio, compras, cartoes, metas, mais, resumo, comparativo, renda, contas, categorias, recorrentes, simulador, lixeira, ajustes, relatorio, conquistas, importar };
const MONTH_VIEWS = new Set(['compras', 'cartoes', 'resumo', 'comparativo', 'renda', 'recorrentes', 'simulador', 'categorias', 'relatorio']);

const $view = document.getElementById('view');
const $title = document.getElementById('topbar-title');
const $sub = document.getElementById('topbar-sub');
const $back = document.getElementById('topbar-back');
const $logo = document.getElementById('topbar-logo');
const $eye = document.getElementById('toggle-hide');
let route = parseHash();
let lastSettings = '';
let unlockTimer = null;

function ctx() {
  return { d: store.get(), ui, query: route.query, root: $view, rerender: () => renderView(), go };
}

function renderTopbar(view) {
  const isHome = route.id === 'inicio';
  const isSub = MORE_ITEMS.some((i) => i.id === route.id);
  $title.textContent = isHome ? 'ChaMony' : view.title;
  $sub.textContent = isHome ? 'Dinheiro com calma' : '';
  $sub.hidden = !isHome;
  $logo.hidden = !isHome;
  $back.hidden = !isSub;
  $eye.innerHTML = `<i class="fas ${ui.hidden ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  $eye.setAttribute('aria-label', ui.hidden ? 'Mostrar valores' : 'Esconder valores');
  $eye.setAttribute('aria-pressed', String(ui.hidden));
  document.title = isHome ? 'ChaMony' : `${view.title} · ChaMony`;
}

function renderView({ enter = false } = {}) {
  const view = VIEWS[route.id] || VIEWS.inicio;
  if (!VIEWS[route.id]) route = { id: 'inicio', query: new URLSearchParams() };
  const y = window.scrollY;
  renderTopbar(view);
  $view.innerHTML = view.render(ctx());
  $view.classList.toggle('view', true);
  if (enter) { $view.style.animation = 'none'; void $view.offsetWidth; $view.style.animation = ''; }
  view.mount?.($view, ctx());
  markCurrent(route.id);
  if (!enter) window.scrollTo(0, y);
}

// ---------------------------------------------------------------------------
// Ações globais (as telas podem ter as próprias em view.actions)
// ---------------------------------------------------------------------------
const GLOBAL = {
  'add-expense': () => { feedback('tap'); return store.get().settings.addMode === 'keypad' ? openQuickAdd() : openExpenseForm(); },
  'edit-expense': (el) => openExpenseForm({ groupId: el.dataset.gid }),
  'month-prev': () => { ui.ym = shiftYM(ui.ym, -1); renderView(); },
  'month-next': () => { ui.ym = shiftYM(ui.ym, 1); renderView(); },
  'month-today': () => { ui.ym = currentYM(); renderView(); },
  'pick-month': (el) => { ui.ym = el.dataset.ym; renderView(); },
  'toggle-hide': () => { setHidden(!ui.hidden); renderTopbar(VIEWS[route.id] || VIEWS.inicio); },
  back: () => (history.length > 1 ? history.back() : go('mais')),
};

function runAction(el, ev) {
  const act = el.dataset.act;
  const view = VIEWS[route.id];
  const fn = view?.actions?.[act] || GLOBAL[act];
  if (!fn) return;
  ev.preventDefault();
  Promise.resolve(fn(el, ctx(), ev)).catch((err) => { console.error(err); toast('Algo deu errado. Tente de novo.'); });
}

const $app = document.getElementById('app');
$app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (el && $app.contains(el) && !el.disabled) runAction(el, ev);
});
$app.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role="button"][data-act]')) runAction(ev.target, ev);
});

// ---------------------------------------------------------------------------
function boot() {
  const d = store.load();
  applyTheme(d.settings);
  lastSettings = JSON.stringify(d.settings);
  setHidden(d.settings.hideOnOpen);
  document.getElementById('bottomnav').innerHTML = renderBottomNav();
  document.getElementById('sidebar').innerHTML = renderSidebar();

  store.subscribe((s) => {
    const cur = JSON.stringify(s.settings);
    if (cur !== lastSettings) { lastSettings = cur; applyTheme(s.settings); }
    renderView();
    reminders.scheduleSync(s);
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(checkUnlocks, 350); // depois da folha/toast da ação, comemora a conquista
  });
  onRoute((r) => {
    const changed = r.id !== route.id;
    route = r;
    if (changed) { ui.bulk.on = false; ui.bulk.sel.clear(); }
    if (changed && !MONTH_VIEWS.has(r.id)) ui.homeExpanded = false;
    renderView({ enter: true });
    if (changed) window.scrollTo(0, 0);
  });
  renderView({ enter: true });

  window.addEventListener('chamony:storage-error', () => toast('Não consegui salvar: o armazenamento do navegador está cheio. Exporte um backup.', { duration: 8000 }));
  if (d._recovered) toast('Encontrei dados ilegíveis e guardei uma cópia à parte. Comecei com dados novos.', { duration: 9000 });

  // Atalho do ícone do app (manifest shortcuts): ?acao=novo
  if (new URLSearchParams(location.search).get('acao') === 'novo') setTimeout(() => openExpenseForm(), 500);

  endSplash(d.settings);
  registerSW();
  // Lembretes: atualiza a lista do service worker e confere o que vence (avisa uma vez por item).
  setTimeout(checkUnlocks, 1800);
  reminders.writeReminders(d).then(() => { if (d.settings.notifications) reminders.checkNow(); }).catch(() => {});
}

function endSplash(settings) {
  const el = document.getElementById('splash');
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = !settings.splash || reduce ? 0 : Math.max(0, 1500 - performance.now());
  setTimeout(() => { el.classList.add('is-done'); setTimeout(() => el.remove(), 500); }, wait);
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (!reg) return;
    const ask = (worker) => toast('Nova versão do ChaMony pronta', { duration: 15000, action: { label: 'Atualizar', fn: () => worker.postMessage('skip-waiting') } });
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
    });
  }).catch((err) => console.warn('SW não registrado', err));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

boot();

