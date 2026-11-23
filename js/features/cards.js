// Cartões: fechamento, vencimento, fatura do mês, ligar/desligar da conta do mês e limite do cartão.

import * as store from '../store.js';
import { esc, uid, clampInt, safeColor } from '../core/dom.js';
import { m, attachMoneyMask } from '../core/money.js';
import { formatYM, dateInMonth, shortDate, shiftYM } from '../core/dates.js';
import * as F from '../core/finance.js';
import { ACCENT_COLORS } from '../store.js';
import { monthBar, toggle, sectionHead, colorPicks, bindFreeColor } from '../ui/parts.js';
import { emptyState } from '../ui/illustrations.js';
import { openSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

function cardTile(d, c, ym) {
  const inv = F.invoice(d, c.id, ym);
  const pct = c.limit ? inv / c.limit : 0;
  const dueYM = c.dueDay > c.closingDay ? ym : shiftYM(ym, 1); // vencimento da fatura deste mês
  return `<article class="ccard ${c.active ? '' : 'is-off'}" style="--c:${safeColor(c.color)}">
    <button type="button" class="ccard__face" data-act="edit-card" data-id="${esc(c.id)}" aria-label="Editar ${esc(c.name)}">
      <div class="row" style="justify-content:space-between"><b class="truncate">${esc(c.name)}</b><i class="fas fa-credit-card"></i></div>
      <div class="ccard__label">Fatura de ${esc(formatYM(ym).toLowerCase())}</div>
      <div class="ccard__value num">${m(inv)}</div>
      <div class="ccard__meta">Fecha dia ${c.closingDay} · vence ${esc(shortDate(dateInMonth(dueYM, c.dueDay)))}</div>
      ${c.limit ? `<div class="ccard__bar"><i style="width:${Math.min(100, pct * 100)}%"></i></div>
        <div class="ccard__meta">${Math.round(pct * 100)}% do limite de ${m(c.limit)}</div>` : ''}
    </button>
    <div class="ccard__foot">
      <span class="small muted grow">${c.active ? 'Entra na conta do mês' : 'Fora da conta do mês'}</span>
      ${toggle(c.active, 'toggle-card', `Incluir ${c.name} na conta do mês`, `data-id="${esc(c.id)}"`)}
    </div>
  </article>`;
}

export function openCardForm(cardId = null) {
  const d = store.get();
  const c = d.cards.find((x) => x.id === cardId);
  const st = { color: c?.color || ACCENT_COLORS[d.cards.length % ACCENT_COLORS.length] };
  const colors = () => colorPicks(ACCENT_COLORS, st.color);
  openSheet({
    title: c ? 'Editar cartão' : 'Novo cartão',
    body: `
      <label class="field"><span>Nome do cartão</span><input class="input" id="cf-name" maxlength="60" placeholder="Ex.: Nubank, Itaú, Inter" value="${esc(c?.name || '')}" ${c ? '' : 'autofocus'}></label>
      <div class="input-row">
        <label class="field"><span>Dia do fechamento</span><input class="input" id="cf-close" type="number" inputmode="numeric" min="1" max="31" value="${c?.closingDay ?? 20}"></label>
        <label class="field"><span>Dia do vencimento</span><input class="input" id="cf-due" type="number" inputmode="numeric" min="1" max="31" value="${c?.dueDay ?? 5}"></label>
      </div>
      <label class="field"><span>Limite do cartão (opcional)</span><input class="input" id="cf-limit"></label>
      <span class="label">Cor</span><div class="pills wrap mb-3" id="cf-colors">${colors()}</div>
      <p class="tiny subtle">Compras feitas depois do fechamento entram na fatura do mês seguinte.</p>`,
    foot: `<div class="btn-row">${c ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir cartão"><i class="fas fa-trash"></i></button>' : ''}
      <button type="button" class="btn primary" data-save>${c ? 'Salvar' : 'Adicionar cartão'}</button></div>`,
    onMount(el, api) {
      const limit = attachMoneyMask(el.querySelector('#cf-limit'), c?.limit || 0);
      bindFreeColor(el, (x) => { st.color = x; el.querySelector('#cf-colors').innerHTML = colors(); });
      el.addEventListener('click', async (e) => {
        const col = e.target.closest('[data-color]');
        if (col) { st.color = col.dataset.color; el.querySelector('#cf-colors').innerHTML = colors(); }
        if (e.target.closest('[data-save]')) {
          const name = el.querySelector('#cf-name').value.trim();
          if (!name) { toast('Dê um nome para o cartão'); return; }
          const data = { name, closingDay: clampInt(el.querySelector('#cf-close').value, 1, 31, 20), dueDay: clampInt(el.querySelector('#cf-due').value, 1, 31, 5), color: st.color, limit: limit.get() };
          store.commit((s) => {
            const cur = s.cards.find((x) => x.id === cardId);
            if (cur) Object.assign(cur, data); else s.cards.push({ id: uid('card'), active: true, ...data });
          });
          api.close(); toast(c ? 'Cartão atualizado' : 'Cartão adicionado');
        }
        if (e.target.closest('[data-del]')) {
          const n = store.get().expenses.filter((x) => x.cardId === cardId).length;
          api.close();
          const ok = await confirmSheet({ title: `Excluir ${c.name}?`, text: n ? `As ${n} compras deste cartão continuam no histórico, marcadas como “Cartão removido”.` : 'O cartão será removido.', confirm: 'Excluir', danger: true });
          if (ok) { store.commit((s) => { s.cards = s.cards.filter((x) => x.id !== cardId); }); toast('Cartão excluído'); }
        }
      });
    },
  });
}

export default {
  id: 'cartoes',
  title: 'Cartões',
  render({ d, ui }) {
    const ym = ui.ym;
    const pix = F.sum(F.monthExpenses(d, ym).filter((e) => e.cardId === 'pix'));
    const total = F.sum(d.cards.filter((c) => c.active).map((c) => ({ amount: F.invoice(d, c.id, ym) })));
    return `${monthBar(ym)}
      <div class="grid-2 mb-3">
        <div class="stat"><span>Faturas no mês</span><b class="num">${m(total)}</b></div>
        <div class="stat"><span>Pix / à vista</span><b class="num">${m(pix)}</b></div>
      </div>
      ${sectionHead(`Seus cartões (${d.cards.length})`, d.cards.length > 1 ? `<div class="row" style="gap:0"><button type="button" class="link-btn" data-act="cards-all" data-on="1">Ligar todos</button><button type="button" class="link-btn" data-act="cards-all" data-on="0">Desligar</button></div>` : '')}
      ${d.cards.length ? `<div class="ccards">${d.cards.map((c) => cardTile(d, c, ym)).join('')}</div>`
        : `<div class="card">${emptyState('card', 'Nenhum cartão ainda', 'Cadastre o fechamento e o vencimento para o ChaMony saber em qual fatura cada compra cai.')}</div>`}
      <button type="button" class="btn ghost block mt-4" data-act="new-card"><i class="fas fa-plus"></i>Adicionar cartão</button>`;
  },
  actions: {
    'new-card': () => openCardForm(),
    'edit-card': (el) => openCardForm(el.dataset.id),
    'toggle-card': (el) => store.commit((s) => { const c = s.cards.find((x) => x.id === el.dataset.id); if (c) c.active = !c.active; }),
    'cards-all': (el) => store.commit((s) => s.cards.forEach((c) => { c.active = el.dataset.on === '1'; })),
  },
};
