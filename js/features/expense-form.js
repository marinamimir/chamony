// Folha "Nova compra / Editar compra" — o modal de compra do AeroSync, em bottom sheet.

import * as store from '../store.js';
import { esc, uid, fold, clampInt, safeColor, safeIcon } from '../core/dom.js';
import { attachMoneyMask, splitInstallments, fmt } from '../core/money.js';
import { todayISO, nowHM, formatYM, isISO } from '../core/dates.js';
import { firstBillingYM, groupRows, catSnapshot } from '../core/finance.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { trashGroups } from './expense-actions.js';
import { putReceipt, getReceipt, deleteReceipt, compressImage } from '../data/idb.js';
import { feedback } from '../ui/feedback.js';

/** Todas as tags já usadas, das mais frequentes para as menos. */
export function allTags(d) {
  const n = new Map();
  d.expenses.forEach((e) => (e.tags || []).forEach((t) => n.set(t, (n.get(t) || 0) + 1)));
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
const parseTags = (s) => String(s || '').split(/[,#]/).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12);

/** Abre a foto do comprovante em tela cheia. */
export async function showReceipt(id) {
  const rec = await getReceipt(id).catch(() => null);
  if (!rec) { toast('Comprovante não encontrado neste aparelho'); return; }
  const url = URL.createObjectURL(rec.blob);
  openSheet({ title: 'Comprovante', body: `<img src="${url}" alt="Foto do comprovante" style="width:100%;border-radius:18px">`, onClose: () => setTimeout(() => URL.revokeObjectURL(url), 500) });
}

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
    tags: [...(first?.tags || preset.tags || [])],
    receiptId: first?.receiptId || null,
    newPhoto: null,       // Blob comprimido ainda não salvo
    removePhoto: false,
    favorite: d.favorites.some((f) => f.desc.toLowerCase() === (first?.desc || preset.desc || '').toLowerCase()),
  };
  const knownTags = allTags(d).slice(0, 12);
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
    <div class="notice" id="ef-hint" aria-live="polite"><i class="fas fa-calendar-check"></i><span></span></div>
    <details class="more" ${first?.note || first?.tags?.length || first?.receiptId ? 'open' : ''}>
      <summary><i class="fas fa-chevron-down"></i>Mais detalhes <span class="tiny subtle">notas, tags, comprovante</span></summary>
      <label class="field"><span>Notas</span><textarea class="textarea" id="ef-note" maxlength="1000" rows="2" placeholder="Algo para lembrar depois…">${esc(first?.note || '')}</textarea></label>
      <label class="field"><span>Tags</span><input class="input" id="ef-tags" placeholder="Ex.: viagem, presente (separe por vírgula)" autocomplete="off"></label>
      <div class="pills wrap mb-3" id="ef-tagpills"></div>
      <span class="label">Comprovante</span>
      <div class="row mb-3" id="ef-photo"></div>
      <input type="file" id="ef-file" accept="image/*" capture="environment" hidden>
      <div class="setting-row"><div><b>Favorito</b><small>Aparece como atalho no teclado rápido</small></div>
        <button type="button" class="toggle" role="switch" id="ef-fav" aria-checked="${state.favorite}" aria-label="Favorito"></button></div>
    </details>`;

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

      const tagPills = () => {
        const extra = parseTags(q('#ef-tags').value);
        const all = [...new Set([...state.tags, ...knownTags])];
        q('#ef-tagpills').innerHTML = all.map((t) => `<button type="button" class="pill" data-tag="${esc(t)}" aria-pressed="${state.tags.includes(t)}">#${esc(t)}</button>`).join('')
          + (extra.length ? `<span class="tiny subtle">+ ${extra.map((t) => '#' + esc(t)).join(' ')}</span>` : '');
      };
      tagPills();
      q('#ef-tags').addEventListener('input', tagPills);
      let thumbUrl = null;
      const photo = async () => {
        if (thumbUrl) { URL.revokeObjectURL(thumbUrl); thumbUrl = null; }
        let blob = state.newPhoto;
        if (!blob && state.receiptId && !state.removePhoto) blob = (await getReceipt(state.receiptId).catch(() => null))?.blob;
        if (blob) thumbUrl = URL.createObjectURL(blob);
        q('#ef-photo').innerHTML = blob
          ? `<button type="button" class="receipt-thumb" data-view aria-label="Ver comprovante"><img src="${thumbUrl}" alt=""></button>
             <button type="button" class="btn sm ghost" data-photo><i class="fas fa-camera"></i>Trocar</button>
             <button type="button" class="icon-btn sm danger" data-nophoto aria-label="Remover foto"><i class="fas fa-xmark"></i></button>`
          : '<button type="button" class="btn sm ghost" data-photo><i class="fas fa-camera"></i>Tirar ou escolher foto</button>';
      };
      photo();
      q('#ef-file').addEventListener('change', async (e) => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        try { state.newPhoto = await compressImage(f); state.removePhoto = false; photo(); } catch { toast('Não consegui abrir essa imagem'); }
      });

      el.addEventListener('click', (e) => {
        const pay = e.target.closest('[data-pay]');
        if (pay) { state.cardId = pay.dataset.pay; q('#ef-pay').innerHTML = payPills(); hint(); return; }
        const cat = e.target.closest('[data-cat]');
        if (cat) { state.catId = cat.dataset.cat; state.touchedCat = true; q('#ef-cats').innerHTML = catPills(); return; }
        if (e.target.closest('#ef-rec')) rec.setAttribute('aria-checked', rec.getAttribute('aria-checked') !== 'true');
        const fav = e.target.closest('#ef-fav'); if (fav) { state.favorite = !state.favorite; fav.setAttribute('aria-checked', state.favorite); }
        const tg = e.target.closest('[data-tag]');
        if (tg) { const t = tg.dataset.tag; state.tags = state.tags.includes(t) ? state.tags.filter((x) => x !== t) : [...state.tags, t]; tagPills(); }
        if (e.target.closest('[data-photo]')) q('#ef-file').click();
        if (e.target.closest('[data-nophoto]')) { state.newPhoto = null; state.removePhoto = true; photo(); }
        if (e.target.closest('[data-view]')) {
          if (state.newPhoto) { const u = URL.createObjectURL(state.newPhoto); openSheet({ title: 'Comprovante', body: `<img src="${u}" alt="" style="width:100%;border-radius:18px">` }); }
          else if (state.receiptId) showReceipt(state.receiptId);
        }
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

      q('[data-save]').addEventListener('click', async () => {
        const amount = money.get();
        const desc = q('#ef-desc').value.trim();
        if (!(amount > 0)) { toast('Digite o valor da compra'); q('#ef-val').focus(); return; }
        if (!desc) { toast('Dê um nome para a compra'); q('#ef-desc').focus(); return; }
        const date = isISO(q('#ef-date').value) ? q('#ef-date').value : todayISO();
        const time = q('#ef-time').value || nowHM();
        const n = clampInt(q('#ef-inst').value, 1, 48, 1);
        const recurring = rec.getAttribute('aria-checked') === 'true';
        const gid = groupId || uid('g');
        const tags = [...new Set([...state.tags, ...parseTags(q('#ef-tags').value)])].slice(0, 12);
        const note = q('#ef-note').value.trim();
        let receiptId = state.removePhoto ? null : state.receiptId;
        try {
          if (state.newPhoto) {
            if (state.receiptId) await deleteReceipt(state.receiptId).catch(() => {});
            receiptId = uid('rc');
            await putReceipt({ id: receiptId, blob: state.newPhoto, createdAt: new Date().toISOString() });
          } else if (state.removePhoto && state.receiptId) await deleteReceipt(state.receiptId).catch(() => {});
        } catch { toast('Não consegui guardar a foto; a compra foi salva sem ela.'); receiptId = null; }
        store.commit((s) => {
          const cat = s.categories.find((c) => c.id === state.catId);
          if (groupId) s.expenses = s.expenses.filter((x) => (x.groupId || x.id) !== groupId);
          splitInstallments(amount, n).forEach((part, i) => {
            s.expenses.push({
              id: `${gid}_${i + 1}`, groupId: gid, desc, amount: part, purchaseDate: date, time,
              cardId: state.cardId, catId: state.catId, catSnap: catSnapshot(cat),
              instIndex: i + 1, instTotal: n, recurring, note, tags, ...(receiptId ? { receiptId } : {}),
              createdAt: first?.createdAt || new Date().toISOString(), ...(first?.source ? { source: first.source } : {}),
            });
          });
          // Favoritos (atalhos do teclado rápido)
          const key = desc.toLowerCase();
          s.favorites = s.favorites.filter((f) => f.desc.toLowerCase() !== key);
          if (state.favorite) s.favorites.unshift({ id: uid('fav'), desc, amount, catId: state.catId, cardId: state.cardId });
        });
        api.close();
        if (thumbUrl) URL.revokeObjectURL(thumbUrl);
        feedback('save');
        toast(isEdit ? 'Compra atualizada' : 'Compra registrada 🌼');
      });

      q('[data-del]')?.addEventListener('click', () => {
        api.close();
        trashGroups([groupId]);
      });
    },
  });
}
