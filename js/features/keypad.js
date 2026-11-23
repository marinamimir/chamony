// Adicionar gasto no modo rápido: teclado numérico grande + favoritos (gastos que se repetem).

import * as store from '../store.js';
import { esc, uid, safeColor, safeIcon, fold } from '../core/dom.js';
import { fmt } from '../core/money.js';
import { todayISO, nowHM } from '../core/dates.js';
import * as F from '../core/finance.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { feedback } from '../ui/feedback.js';
import { openExpenseForm } from './expense-form.js';

/** Favoritos fixados + os gastos que mais se repetem (com a última categoria/pagamento usados). */
export function shortcuts(d, max = 8) {
  const pinned = d.favorites.map((f) => ({ ...f, pinned: true }));
  const seen = new Set(pinned.map((f) => fold(f.desc)));
  const count = new Map();
  [...d.expenses].filter((e) => e.instIndex === 1 && e.instTotal === 1).forEach((e) => {
    const k = fold(e.desc);
    const cur = count.get(k) || { n: 0, e };
    cur.n += 1; cur.e = e;
    count.set(k, cur);
  });
  const frequent = [...count.entries()].filter(([k, v]) => v.n >= 2 && !seen.has(k)).sort((a, b) => b[1].n - a[1].n)
    .map(([, v]) => ({ id: `freq-${v.e.id}`, desc: v.e.desc, amount: v.e.amount, catId: v.e.catId, cardId: v.e.cardId }));
  return [...pinned, ...frequent].slice(0, max);
}

export function openQuickAdd() {
  const d = store.get();
  const st = { cents: 0, desc: '', catId: d.categories[0]?.id || '', cardId: 'pix' };
  const cards = d.cards.filter((c) => c.active);
  const favs = shortcuts(d);

  const amountHTML = () => `<span class="num">${fmt(st.cents)}</span>`;
  const catPills = () => d.categories.map((c) => `<button type="button" class="pill" data-cat="${esc(c.id)}" style="--c:${safeColor(c.color)}" aria-pressed="${st.catId === c.id}"><i class="fas ${safeIcon(c.icon)}"></i>${esc(c.name)}</button>`).join('');
  const payPills = () => [['pix', 'Pix', '#8FD3B6', 'fa-bolt'], ...cards.map((c) => [c.id, c.name, c.color, 'fa-credit-card'])]
    .map(([id, n, c, i]) => `<button type="button" class="pill" data-pay="${esc(id)}" style="--c:${safeColor(c)}" aria-pressed="${st.cardId === id}"><i class="fas ${i}"></i>${esc(n)}</button>`).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'];

  openSheet({
    title: 'Gasto rápido',
    body: `
      ${favs.length ? `<div class="pills mb-2" aria-label="Favoritos">${favs.map((f) => `<button type="button" class="pill fav-pill" data-fav="${esc(f.id)}"><i class="fas ${f.pinned ? 'fa-star' : 'fa-clock-rotate-left'}"></i>${esc(f.desc)}${f.amount ? ` <span class="subtle num">${esc(fmt(f.amount))}</span>` : ''}</button>`).join('')}</div>` : ''}
      <div class="kp-amount" id="kp-amount" aria-live="polite">${amountHTML()}</div>
      <input class="input kp-desc" id="kp-desc" maxlength="140" placeholder="Descrição (opcional)" autocomplete="off">
      <div class="pills mt-2" id="kp-cats">${catPills()}</div>
      <div class="pills" id="kp-pay">${payPills()}</div>
      <div class="keypad" role="group" aria-label="Teclado numérico">${keys.map((k) => `<button type="button" class="key" data-key="${k}" aria-label="${k === 'del' ? 'Apagar' : k}">${k === 'del' ? '<i class="fas fa-delete-left"></i>' : k}</button>`).join('')}</div>`,
    foot: `<div class="btn-row"><button type="button" class="btn ghost" data-more style="flex:0 0 auto"><i class="fas fa-sliders"></i>Mais</button>
      <button type="button" class="btn primary" data-save><i class="fas fa-check"></i>Salvar</button></div>`,
    onMount(el, api) {
      const q = (s) => el.querySelector(s);
      const redraw = () => { q('#kp-amount').innerHTML = amountHTML(); };
      el.addEventListener('click', (e) => {
        const k = e.target.closest('[data-key]');
        if (k) {
          const key = k.dataset.key;
          if (key === 'del') st.cents = Math.floor(st.cents / 10);
          else for (const ch of key) if (st.cents < 1e10) st.cents = st.cents * 10 + Number(ch);
          feedback('tap'); redraw(); return;
        }
        const c = e.target.closest('[data-cat]'); if (c) { st.catId = c.dataset.cat; q('#kp-cats').innerHTML = catPills(); return; }
        const p = e.target.closest('[data-pay]'); if (p) { st.cardId = p.dataset.pay; q('#kp-pay').innerHTML = payPills(); return; }
        const f = e.target.closest('[data-fav]');
        if (f) {
          const fav = favs.find((x) => x.id === f.dataset.fav);
          q('#kp-desc').value = fav.desc;
          if (d.categories.some((x) => x.id === fav.catId)) st.catId = fav.catId;
          if (fav.cardId === 'pix' || cards.some((x) => x.id === fav.cardId)) st.cardId = fav.cardId;
          if (fav.amount) st.cents = fav.amount;
          q('#kp-cats').innerHTML = catPills(); q('#kp-pay').innerHTML = payPills(); redraw(); feedback('tap');
          return;
        }
        if (e.target.closest('[data-more]')) {
          api.close();
          openExpenseForm({ preset: { amount: st.cents, desc: q('#kp-desc').value.trim(), catId: st.catId, cardId: st.cardId } });
          return;
        }
        if (e.target.closest('[data-save]')) {
          if (!(st.cents > 0)) { toast('Digite o valor no teclado'); return; }
          const cat = store.get().categories.find((x) => x.id === st.catId);
          const desc = q('#kp-desc').value.trim() || cat?.name || 'Gasto';
          const gid = uid('g');
          store.commit((s) => s.expenses.push({
            id: `${gid}_1`, groupId: gid, desc, amount: st.cents, purchaseDate: todayISO(), time: nowHM(), cardId: st.cardId, catId: st.catId,
            catSnap: F.catSnapshot(cat), instIndex: 1, instTotal: 1, recurring: false, note: '', tags: [], createdAt: new Date().toISOString(),
          }));
          api.close(); feedback('save'); toast('Gasto registrado 🌼');
        }
      });
    },
  });
}
