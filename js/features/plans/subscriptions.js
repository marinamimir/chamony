// Assinaturas: custo por mês e por ano, próxima cobrança e "lançar no mês" (vira compra recorrente).

import * as store from '../../store.js';
import { esc, uid, clampInt, safeColor, safeIcon } from '../../core/dom.js';
import { m, attachMoneyMask } from '../../core/money.js';
import { MONTHS, todayISO, currentYM, shortDate, inDays, dateInMonth, daysBetween, shiftYM } from '../../core/dates.js';
import * as F from '../../core/finance.js';
import { CAT_COLORS } from '../../store.js';
import { chip, toggle, colorPicks, bindFreeColor } from '../../ui/parts.js';
import { emptyState } from '../../ui/illustrations.js';
import { openSheet, confirmSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';

export const subMonthly = (x) => (x.cycle === 'yearly' ? Math.round(x.amount / 12) : x.amount);

/** Próxima cobrança a partir de hoje. */
export function nextCharge(x, today = todayISO()) {
  const ym = today.slice(0, 7);
  if (x.cycle === 'yearly') {
    const y = Number(ym.slice(0, 4));
    for (const yy of [y, y + 1]) { const d = dateInMonth(`${yy}-${String(x.month).padStart(2, '0')}`, x.day); if (d >= today) return d; }
  }
  for (const k of [ym, shiftYM(ym, 1)]) { const d = dateInMonth(k, x.day); if (d >= today) return d; }
  return dateInMonth(shiftYM(ym, 1), x.day);
}

/** Já existe a compra desta assinatura no mês de cobrança? */
const launchedIn = (d, x, ym) => d.expenses.some((e) => e.source === `sub:${x.id}` && e.purchaseDate.slice(0, 7) === ym);
const dueThisMonth = (x, ym) => x.active && (x.cycle === 'monthly' || Number(ym.slice(5, 7)) === x.month);

function launch(s, x, ym) {
  const cat = s.categories.find((c) => c.id === x.catId);
  const gid = uid('g');
  s.expenses.push({ id: `${gid}_1`, groupId: gid, desc: x.name, amount: x.amount, purchaseDate: dateInMonth(ym, x.day), time: '09:00', cardId: x.cardId, catId: x.catId,
    catSnap: F.catSnapshot(cat), instIndex: 1, instTotal: 1, recurring: true, source: `sub:${x.id}`, createdAt: new Date().toISOString(), tags: ['assinatura'] });
}

function openSubForm(id = null) {
  const d = store.get();
  const x = d.subscriptions.find((y) => y.id === id);
  const st = { cycle: x?.cycle || 'monthly', cardId: x?.cardId || 'pix', catId: x?.catId || d.categories.find((c) => /lazer|assin/i.test(c.name))?.id || d.categories[0]?.id, color: x?.color || '#D6D0F5' };
  const dyn = () => `
    <div class="segmented mb-3"><button type="button" data-cycle="monthly" aria-pressed="${st.cycle === 'monthly'}">Mensal</button><button type="button" data-cycle="yearly" aria-pressed="${st.cycle === 'yearly'}">Anual</button></div>
    <span class="label">Pagamento</span>
    <div class="pills mb-3">${[['pix', 'Pix / Conta', '#8FD3B6', 'fa-bolt'], ...d.cards.map((c) => [c.id, c.name, c.color, 'fa-credit-card'])].map(([cid, n, c, i]) => `<button type="button" class="pill" data-card="${esc(cid)}" style="--c:${safeColor(c)}" aria-pressed="${st.cardId === cid}"><i class="fas ${i}"></i>${esc(n)}</button>`).join('')}</div>
    <span class="label">Categoria</span>
    <div class="pills mb-3">${d.categories.map((c) => `<button type="button" class="pill" data-cat="${esc(c.id)}" style="--c:${safeColor(c.color)}" aria-pressed="${st.catId === c.id}"><i class="fas ${safeIcon(c.icon)}"></i>${esc(c.name)}</button>`).join('')}</div>
    <span class="label">Cor</span><div class="pills wrap">${colorPicks(CAT_COLORS, st.color)}</div>`;
  openSheet({
    title: x ? 'Editar assinatura' : 'Nova assinatura',
    body: `<label class="field"><span>Nome</span><input class="input" id="sf-name" maxlength="80" placeholder="Ex.: streaming, academia, nuvem" value="${esc(x?.name || '')}" ${x ? '' : 'autofocus'}></label>
      <label class="field"><span>Valor da cobrança</span><input class="input money" id="sf-val"></label>
      <div class="input-row">
        <label class="field"><span>Dia da cobrança</span><input class="input" id="sf-day" type="number" inputmode="numeric" min="1" max="31" value="${x?.day ?? 10}"></label>
        <label class="field"><span>Mês (se anual)</span><select class="select" id="sf-month">${MONTHS.map((n, i) => `<option value="${i + 1}" ${(x?.month || Number(currentYM().slice(5))) === i + 1 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div><div id="sf-dyn">${dyn()}</div>`,
    foot: `<div class="btn-row">${x ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir"><i class="fas fa-trash"></i></button>' : ''}<button type="button" class="btn primary" data-save>Salvar</button></div>`,
    onMount(el, api) {
      const val = attachMoneyMask(el.querySelector('#sf-val'), x?.amount || 0);
      const re = () => { el.querySelector('#sf-dyn').innerHTML = dyn(); };
      bindFreeColor(el, (c) => { st.color = c; re(); });
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-cycle],[data-card],[data-cat],[data-color]');
        if (t) {
          if (t.dataset.cycle) st.cycle = t.dataset.cycle;
          if (t.dataset.card) st.cardId = t.dataset.card;
          if (t.dataset.cat) st.catId = t.dataset.cat;
          if (t.dataset.color) st.color = t.dataset.color;
          re();
        }
        if (e.target.closest('[data-save]')) {
          const name = el.querySelector('#sf-name').value.trim();
          if (!name || !(val.get() > 0)) { toast('Preencha o nome e o valor'); return; }
          const data = { name, amount: val.get(), day: clampInt(el.querySelector('#sf-day').value, 1, 31, 10), month: clampInt(el.querySelector('#sf-month').value, 1, 12, 1), ...st };
          store.commit((s) => { const cur = s.subscriptions.find((y) => y.id === id); if (cur) Object.assign(cur, data); else s.subscriptions.push({ id: uid('sub'), active: true, ...data }); });
          api.close(); toast('Assinatura salva');
        }
        if (e.target.closest('[data-del]')) {
          api.close();
          if (await confirmSheet({ title: `Excluir “${x.name}”?`, text: 'As compras já lançadas continuam no histórico.', confirm: 'Excluir', danger: true })) store.commit((s) => { s.subscriptions = s.subscriptions.filter((y) => y.id !== id); });
        }
      });
    },
  });
}

export const subscriptionsTab = {
  title: 'Assinaturas', icon: 'fa-rotate',
  render(d) {
    const active = d.subscriptions.filter((x) => x.active);
    const monthly = F.sum(active.map((x) => ({ amount: subMonthly(x) })));
    const ym = currentYM();
    const pending = active.filter((x) => dueThisMonth(x, ym) && !launchedIn(d, x, ym));
    const list = [...d.subscriptions].sort((a, b) => Number(b.active) - Number(a.active) || nextCharge(a).localeCompare(nextCharge(b)));
    return `<div class="grid-2 mb-3"><div class="stat"><span>Por mês</span><b class="num">${m(monthly)}</b></div><div class="stat"><span>Por ano</span><b class="num">${m(monthly * 12)}</b></div></div>
      ${pending.length ? `<div class="notice mb-3"><i class="fas fa-receipt"></i><span class="grow">${pending.length} assinatura(s) deste mês ainda não viraram compra.</span><button type="button" class="link-btn" data-act="sub-launch-all">Lançar</button></div>` : ''}
      ${list.length ? `<div class="list">${list.map((x) => { const n = nextCharge(x); const days = daysBetween(todayISO(), n); return `
        <div class="list-row ${x.active ? '' : 'is-off'}">
          ${chip(x.color, 'fa-rotate')}
          <button type="button" class="list-row__main" data-act="sub-edit" data-id="${esc(x.id)}" style="border:0;background:none;text-align:left;padding:0">
            <div class="list-row__title">${esc(x.name)}</div>
            <div class="list-row__meta">${x.cycle === 'yearly' ? `anual · ${MONTHS[x.month - 1].slice(0, 3).toLowerCase()}` : 'mensal'} · ${x.active ? `próxima ${esc(shortDate(n))} (${esc(inDays(days))})` : 'pausada'} · ${esc(F.payMethod(d, x.cardId).name)}</div></button>
          <div class="list-row__value">${m(x.amount)}</div>
          ${toggle(x.active, 'sub-toggle', `Ativa: ${x.name}`, `data-id="${esc(x.id)}"`)}
        </div>`; }).join('')}</div>`
        : `<div class="card">${emptyState('tea', 'Nenhuma assinatura', 'Streaming, academia, apps… Veja quanto somam por mês e por ano.')}</div>`}
      <button type="button" class="btn primary block mt-4" data-act="sub-new"><i class="fas fa-plus"></i>Nova assinatura</button>
      <p class="tiny subtle mt-2">“Lançar” cria a compra do mês (marcada como recorrente), sem duplicar.</p>`;
  },
  actions: {
    'sub-new': () => openSubForm(),
    'sub-edit': (el) => openSubForm(el.dataset.id),
    'sub-toggle': (el) => store.commit((s) => { const x = s.subscriptions.find((y) => y.id === el.dataset.id); if (x) x.active = !x.active; }),
    'sub-launch-all': () => {
      const ym = currentYM(); let n = 0;
      store.commit((s) => { s.subscriptions.filter((x) => dueThisMonth(x, ym) && !launchedIn(s, x, ym)).forEach((x) => { launch(s, x, ym); n += 1; }); });
      toast(`${n} assinatura(s) lançada(s) em ${MONTHS[Number(ym.slice(5)) - 1].toLowerCase()}`);
    },
  },
};
