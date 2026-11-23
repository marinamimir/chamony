// Folha "Nova compra / Editar compra" — o modal de compra do AeroSync, em bottom sheet.

import * as store from '../store.js';
import { esc, uid, fold, clampInt, safeColor, safeIcon } from '../core/dom.js';
import { attachMoneyMask, splitInstallments, fmt } from '../core/money.js';
import { todayISO, nowHM, formatYM, isISO } from '../core/dates.js';
import { firstBillingYM, groupRows, catSnapshot } from '../core/finance.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { trashGroups } from './expense-actions.js';

/** Sugere a categoria pela última compra com a mesma descrição (aprende com o que já foi categorizado). */
function suggestCategory(d, desc) {
  const key = fold(desc).trim();
  if (key.length < 2) return null;
  const hit = [...d.expenses].reverse().find((e) => fold(e.desc).trim() === key);
  return hit ? { catId: hit.catId, cardId: hit.cardId } : null;
}

export function openExpenseForm({ groupId = null, preset = {} } = {}) {
  const d = store.get();
  const rows = groupId ? groupRows(d.expenses, groupId) : [];
  const first = rows[0];
  const isEdit = !!first;
  const total = isEdit ? rows.reduce((s, r) => s + r.amount, 0) : (preset.amount || 0);
  const state = {
    cardId: first?.cardId || preset.cardId || 'pix',
    catId: first?.catId || preset.catId || d.categories[0]?.id || '',
    inst: first?.instTotal || 1,
    touchedCat: isEdit,
  };
  const descs = [...new Set(d.expenses.slice(-300).map((e) => e.desc))].slice(-80);
  const cards = d.cards.filter((c) => c.active || c.id === state.cardId);

  const payPills = () => [
    `<button type="button" class="pill" data-pay="pix" style="--c:#8FD3B6" aria-pressed="${state.cardId === 'pix'}"><i class="fas fa-bolt"></i>Pix / Conta</button>`,
    ...cards.map((c) => `<button type="button" class="pill" data-pay="${esc(c.id)}" style="--c:${safeColor(c.color)}" aria-pressed="${state.cardId === c.id}"><i class="fas fa-credit-card"></i>${esc(c.name)}</button>`),
  ].join('');
  const catPills = () => d.categories.map((c) =>
    `<button type="button" class="pill" data-cat="${esc(c.id)}" style="--c:${safeColor(c.color)}" aria-pressed="${state.catId === c.id}"><i class="fas ${safeIcon(c.icon)}"></i>${esc(c.name)}</button>`).join('');

  const body = `
    <label class="field"><span>Valor total</span><input class="input money" id="ef-val" aria-label="Valor total" ${isEdit ? '' : 'autofocus'}></label>
    <label class="field"><span>Descrição</span>
      <input class="input" id="ef-desc" list="ef-descs" maxlength="140" placeholder="Ex.: mercado, farmácia, presente…" value="${esc(first?.desc || preset.desc || '')}" autocomplete="off" enterkeyhint="done">
      <datalist id="ef-descs">${descs.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
    </label>
    <span class="label">Forma de pagamento</span>
    <div class="pills mb-3" id="ef-pay">${payPills()}</div>
    <div class="row" style="justify-content:space-between"><span class="label">Categoria</span><a class="link-btn" href="#/categorias" data-sheet-close>Gerenciar</a></div>
    <div class="pills wrap mb-3" id="ef-cats">${catPills()}</div>
    <div class="input-row">
      <label class="field"><span>Data da compra</span><input class="input" type="date" id="ef-date" value="${esc(first?.purchaseDate || preset.date || todayISO())}"></label>
      <label class="field"><span>Horário</span><input class="input" type="time" id="ef-time" value="${esc(first?.time || nowHM())}"></label>
    </div>
    <div class="input-row">
      <label class="field"><span>Parcelas</span><input class="input" type="number" inputmode="numeric" min="1" max="48" id="ef-inst" value="${state.inst}"></label>
      <div class="field"><span>Recorrente</span>
        <div class="row" style="min-height:48px"><button type="button" class="toggle" role="switch" id="ef-rec" aria-checked="${!!first?.recurring}" aria-label="Compra recorrente"></button>
        <small class="muted small">todo mês</small></div></div>
    </div>
    <div class="notice" id="ef-hint" aria-live="polite"><i class="fas fa-calendar-check"></i><span></span></div>`;

  const foot = `<div class="btn-row">
    ${isEdit ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto"><i class="fas fa-trash"></i></button>' : ''}
    <button type="button" class="btn primary" data-save><i class="fas fa-check"></i>${isEdit ? 'Salvar alterações' : 'Adicionar compra'}</button></div>`;

  openSheet({
    title: isEdit ? 'Editar compra' : 'Nova compra',
    body, foot,
    onMount(el, api) {
      const q = (s) => el.querySelector(s);
      const money = attachMoneyMask(q('#ef-val'), total);
      const rec = q('#ef-rec');

      const hint = () => {
        const date = q('#ef-date').value || todayISO();
        const n = clampInt(q('#ef-inst').value, 1, 48, 1);
        const ym = firstBillingYM(store.get(), date, state.cardId);
        const parts = splitInstallments(money.get(), n);
        const where = state.cardId === 'pix' ? `Sai em ${formatYM(ym).toLowerCase()}` : `Cai na fatura de ${formatYM(ym).toLowerCase()}`;
        q('#ef-hint span').innerHTML = `${esc(where)}${n > 1 ? ` · ${n}x de <span class="m num"><span class="mv">${fmt(parts[parts.length - 1])}</span></span>` : ''}`;
      };
      hint();

      el.addEventListener('click', (e) => {
        const pay = e.target.closest('[data-pay]');
        if (pay) { state.cardId = pay.dataset.pay; q('#ef-pay').innerHTML = payPills(); hint(); return; }
        const cat = e.target.closest('[data-cat]');
        if (cat) { state.catId = cat.dataset.cat; state.touchedCat = true; q('#ef-cats').innerHTML = catPills(); return; }
        if (e.target.closest('#ef-rec')) rec.setAttribute('aria-checked', rec.getAttribute('aria-checked') !== 'true');
      });
      ['#ef-date', '#ef-inst', '#ef-val'].forEach((s) => q(s).addEventListener('change', hint));
      q('#ef-inst').addEventListener('input', hint);
      q('#ef-desc').addEventListener('change', () => {
        if (state.touchedCat) return;
        const sug = suggestCategory(store.get(), q('#ef-desc').value);
        if (sug && d.categories.some((c) => c.id === sug.catId)) {
          state.catId = sug.catId; q('#ef-cats').innerHTML = catPills();
          if (sug.cardId && (sug.cardId === 'pix' || cards.some((c) => c.id === sug.cardId))) { state.cardId = sug.cardId; q('#ef-pay').innerHTML = payPills(); hint(); }
        }
      });

      q('[data-save]').addEventListener('click', () => {
        const amount = money.get();
        const desc = q('#ef-desc').value.trim();
        if (!(amount > 0)) { toast('Digite o valor da compra'); q('#ef-val').focus(); return; }
        if (!desc) { toast('Dê um nome para a compra'); q('#ef-desc').focus(); return; }
        const date = isISO(q('#ef-date').value) ? q('#ef-date').value : todayISO();
        const time = q('#ef-time').value || nowHM();
        const n = clampInt(q('#ef-inst').value, 1, 48, 1);
        const recurring = rec.getAttribute('aria-checked') === 'true';
        const gid = groupId || uid('g');
        store.commit((s) => {
          const cat = s.categories.find((c) => c.id === state.catId);
          if (groupId) s.expenses = s.expenses.filter((x) => (x.groupId || x.id) !== groupId);
          splitInstallments(amount, n).forEach((part, i) => {
            s.expenses.push({
              id: `${gid}_${i + 1}`, groupId: gid, desc, amount: part, purchaseDate: date, time,
              cardId: state.cardId, catId: state.catId, catSnap: catSnapshot(cat),
              instIndex: i + 1, instTotal: n, recurring, note: first?.note || '', createdAt: first?.createdAt || new Date().toISOString(),
            });
          });
        });
        api.close();
        if (navigator.vibrate && !isEdit) navigator.vibrate(12);
        toast(isEdit ? 'Compra atualizada' : 'Compra registrada 🌼');
      });

      q('[data-del]')?.addEventListener('click', () => {
        api.close();
        trashGroups([groupId]);
      });
    },
  });
}
