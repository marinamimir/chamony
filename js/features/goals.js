// Metas — hub de planejamento: metas de economia, desejos, assinaturas, dívidas e investimentos.

import { esc } from '../core/dom.js';
import { goalsTab } from './plans/goals.js';
import { wishesTab } from './plans/wishes.js';
import { subscriptionsTab } from './plans/subscriptions.js';
import { debtsTab } from './plans/debts.js';
import { investmentsTab } from './plans/investments.js';

const TABS = { metas: goalsTab, desejos: wishesTab, assinaturas: subscriptionsTab, dividas: debtsTab, investimentos: investmentsTab };

function current(ctx) {
  const q = ctx.query?.get('aba');
  if (q && TABS[q]) ctx.ui.planTab = q;
  return TABS[ctx.ui.planTab] ? ctx.ui.planTab : 'metas';
}

export default {
  id: 'metas',
  title: 'Metas',
  render(ctx) {
    const tab = current(ctx);
    return `<div class="plan-tabs" role="tablist">${Object.entries(TABS).map(([id, t]) => `
      <button type="button" class="pill" role="tab" data-act="plan-tab" data-tab="${id}" aria-pressed="${id === tab}" aria-selected="${id === tab}"><i class="fas ${t.icon}"></i>${esc(t.title)}</button>`).join('')}</div>
      ${TABS[tab].render(ctx.d, ctx)}`;
  },
  actions: new Proxy({}, {
    get(_, act) {
      if (act === 'plan-tab') return (el, ctx) => { ctx.ui.planTab = el.dataset.tab; history.replaceState(null, '', `#/metas?aba=${el.dataset.tab}`); ctx.rerender(); };
      for (const t of Object.values(TABS)) if (t.actions?.[act]) return t.actions[act];
      return undefined;
    },
  }),
};
