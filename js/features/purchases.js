// Compras: lista do mês (por data da fatura), filtros, seleção/edição em massa, lixeira, colar extrato.

import * as store from '../store.js';
import { esc, uid, safeColor, safeIcon, plural } from '../core/dom.js';
import { m, parseBRL, splitInstallments } from '../core/money.js';
import { friendlyDay, todayISO, nowHM, isISO, parseISO, toISO } from '../core/dates.js';
import * as F from '../core/finance.js';
import { monthBar, expenseRow } from '../ui/parts.js';
import { emptyState } from '../ui/illustrations.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { trashGroups, bulkEdit } from './expense-actions.js';

export function filterBar(d, f) {
  const active = F.isFilterActive(f);
  const catNames = f.cats.map((id) => d.categories.find((c) => c.id === id)?.name).filter(Boolean);
  const payName = f.card === 'all' ? '' : F.payMethod(d, f.card).name;
  const summary = [catNames.length ? catNames.join(', ') : '', payName, f.text ? `“${f.text}”` : ''].filter(Boolean).join(' · ');
  return `<div class="row mb-3">
    <label class="grow" style="position:relative">
      <i class="fas fa-magnifying-glass subtle" style="position:absolute;left:16px;top:50%;transform:translateY(-50%)"></i>
      <input class="input" type="search" id="flt-text" placeholder="Buscar compra" value="${esc(f.text)}" style="padding-left:42px" enterkeyhint="search">
    </label>
    <button type="button" class="icon-btn filled" data-act="open-filters" aria-label="Filtros" style="${active ? 'color:var(--ui-accent)' : ''}">
      <i class="fas fa-sliders"></i></button>
  </div>
  ${active ? `<div class="notice mb-3"><i class="fas fa-filter"></i><span class="grow">Filtrando: ${esc(summary)}</span><button type="button" class="link-btn" data-act="clear-filters">Limpar</button></div>` : ''}`;
}

export function openFilters(d, ui, rerender) {
  const f = structuredClone(ui.filter);
  const render = () => `
    <span class="label">Categorias</span>
    <div class="pills wrap mb-3">${d.categories.map((c) => `<button type="button" class="pill" data-fcat="${esc(c.id)}" style="--c:${safeColor(c.color)}" aria-pressed="${f.cats.includes(c.id)}"><i class="fas ${safeIcon(c.icon)}"></i>${esc(c.name)}</button>`).join('')}</div>
    <span class="label">Forma de pagamento</span>
    <div class="pills wrap">${[['all', 'Todas', '#A7B0C2', 'fa-layer-group'], ['pix', 'Pix / Conta', '#8FD3B6', 'fa-bolt'], ...d.cards.map((c) => [c.id, c.name, c.color, 'fa-credit-card'])]
      .map(([id, name, color, icon]) => `<button type="button" class="pill" data-fcard="${esc(id)}" style="--c:${safeColor(color)}" aria-pressed="${f.card === id}"><i class="fas ${icon}"></i>${esc(name)}</button>`).join('')}</div>`;
  openSheet({
    title: 'Filtros',
    body: render(),
    foot: '<div class="btn-row"><button type="button" class="btn ghost" data-clear>Limpar</button><button type="button" class="btn primary" data-apply>Aplicar</button></div>',
    onMount(el, api) {
      el.addEventListener('click', (e) => {
        const c = e.target.closest('[data-fcat]');
        if (c) { const id = c.dataset.fcat; f.cats = f.cats.includes(id) ? f.cats.filter((x) => x !== id) : [...f.cats, id]; api.setBody(render()); }
        const k = e.target.closest('[data-fcard]');
        if (k) { f.card = k.dataset.fcard; api.setBody(render()); }
        if (e.target.closest('[data-clear]')) { ui.filter = F.emptyFilter(); api.close(); rerender(); }
        if (e.target.closest('[data-apply]')) { ui.filter = f; api.close(); rerender(); }
      });
    },
  });
}

function openBulkSheet(d, gids, done) {
  const st = { cardId: '', catId: '' };
  const render = () => `
    <p class="small muted mb-3">O que mudar nas <b>${plural(gids.length, 'compra selecionada', 'compras selecionadas')}</b>? O que ficar em “Manter” não muda.</p>
    <span class="label">Forma de pagamento</span>
    <div class="pills mb-3">${[['', 'Manter', '#A7B0C2', 'fa-equals'], ['pix', 'Pix / Conta', '#8FD3B6', 'fa-bolt'], ...d.cards.map((c) => [c.id, c.name, c.color, 'fa-credit-card'])]
      .map(([id, name, color, icon]) => `<button type="button" class="pill" data-bcard="${esc(id)}" style="--c:${safeColor(color)}" aria-pressed="${st.cardId === id}"><i class="fas ${icon}"></i>${esc(name)}</button>`).join('')}</div>
    <span class="label">Categoria</span>
    <div class="pills wrap mb-3">${[['', 'Manter', '#A7B0C2', 'fa-equals'], ...d.categories.map((c) => [c.id, c.name, c.color, c.icon])]
      .map(([id, name, color, icon]) => `<button type="button" class="pill" data-bcat="${esc(id)}" style="--c:${safeColor(color)}" aria-pressed="${st.catId === id}"><i class="fas ${safeIcon(icon)}"></i>${esc(name)}</button>`).join('')}</div>
    <label class="field"><span>Nova data da compra (opcional)</span><input class="input" type="date" id="bk-date"></label>`;
  openSheet({
    title: 'Editar selecionadas',
    body: render(),
    foot: `<button type="button" class="btn primary block" data-apply>Aplicar em ${gids.length}</button>`,
    onMount(el, api) {
      el.addEventListener('click', (e) => {
        const date = el.querySelector('#bk-date')?.value || '';
        const k = e.target.closest('[data-bcard]');
        if (k) { st.cardId = k.dataset.bcard; api.setBody(render()); el.querySelector('#bk-date').value = date; }
        const c = e.target.closest('[data-bcat]');
        if (c) { st.catId = c.dataset.bcat; api.setBody(render()); el.querySelector('#bk-date').value = date; }
        if (e.target.closest('[data-apply]')) {
          bulkEdit(gids, { ...st, date });
          api.close(); done(); toast('Compras atualizadas');
        }
      });
    },
  });
}

/** Colar linhas de extrato: "Nome;Valor;AAAA-MM-DD;Parcelas" (mesmo formato do AeroSync). */
function openPasteSheet(d) {
  const st = { cardId: 'pix', catId: d.categories[0]?.id || '' };
  const pills = () => `
    <span class="label">Forma de pagamento</span>
    <div class="pills mb-3">${[['pix', 'Pix / Conta', '#8FD3B6', 'fa-bolt'], ...d.cards.map((c) => [c.id, c.name, c.color, 'fa-credit-card'])]
      .map(([id, name, color, icon]) => `<button type="button" class="pill" data-pcard="${esc(id)}" style="--c:${safeColor(color)}" aria-pressed="${st.cardId === id}"><i class="fas ${icon}"></i>${esc(name)}</button>`).join('')}</div>
    <span class="label">Categoria</span>
    <div class="pills mb-3">${d.categories.map((c) => `<button type="button" class="pill" data-pcat="${esc(c.id)}" style="--c:${safeColor(c.color)}" aria-pressed="${st.catId === c.id}"><i class="fas ${safeIcon(c.icon)}"></i>${esc(c.name)}</button>`).join('')}</div>`;
  openSheet({
    title: 'Colar linhas de extrato',
    body: `<p class="small muted mb-3">Uma compra por linha: <b>Nome;Valor;Data;Parcelas</b>. Data e parcelas são opcionais. Tudo é processado aqui no aparelho.</p>
      <textarea class="textarea mb-3" id="ps-text" rows="5" placeholder="iFood;45,90;${todayISO()}&#10;Veterinário;300,00;${todayISO()};3"></textarea>
      <div id="ps-pills">${pills()}</div>`,
    foot: '<button type="button" class="btn primary block" data-import>Importar linhas</button>',
    onMount(el, api) {
      el.addEventListener('click', (e) => {
        const k = e.target.closest('[data-pcard]');
        if (k) { st.cardId = k.dataset.pcard; el.querySelector('#ps-pills').innerHTML = pills(); }
        const c = e.target.closest('[data-pcat]');
        if (c) { st.catId = c.dataset.pcat; el.querySelector('#ps-pills').innerHTML = pills(); }
        if (!e.target.closest('[data-import]')) return;
        const lines = el.querySelector('#ps-text').value.split('\n').map((l) => l.trim()).filter(Boolean);
        let ok = 0, bad = 0;
        store.commit((s) => {
          const cat = s.categories.find((x) => x.id === st.catId);
          lines.forEach((line) => {
            const [desc, val, date, inst] = line.split(';').map((x) => (x || '').trim());
            const amount = parseBRL(val);
            if (!desc || !(amount > 0)) { bad += 1; return; }
            const n = Math.max(1, Math.min(48, parseInt(inst, 10) || 1));
            const pd = isISO(date) ? date : brDate(date) || todayISO();
            const gid = uid('g');
            splitInstallments(amount, n).forEach((part, i) => s.expenses.push({
              id: `${gid}_${i + 1}`, groupId: gid, desc, amount: part, purchaseDate: pd, time: nowHM(), cardId: st.cardId, catId: st.catId,
              catSnap: F.catSnapshot(cat), instIndex: i + 1, instTotal: n, recurring: false, source: 'colado', createdAt: new Date().toISOString(),
            }));
            ok += 1;
          });
        });
        api.close();
        toast(`${plural(ok, 'compra importada', 'compras importadas')}${bad ? ` · ${bad} linha(s) ignorada(s)` : ''}`);
      });
    },
  });
}
/** "23/11/2026" ou "23/11" → ISO */
function brDate(s) {
  const mt = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s || '');
  if (!mt) return null;
  const y = mt[3] ? (mt[3].length === 2 ? 2000 + Number(mt[3]) : Number(mt[3])) : new Date().getFullYear();
  const iso = toISO(new Date(y, Number(mt[2]) - 1, Number(mt[1])));
  return isISO(iso) && parseISO(iso).getDate() === Number(mt[1]) ? iso : null;
}

export default {
  id: 'compras',
  title: 'Compras',
  render({ d, ui }) {
    const list = F.monthExpenses(d, ui.ym, { filter: ui.filter })
      .sort((a, b) => (b.purchaseDate + b.time).localeCompare(a.purchaseDate + a.time));
    const total = F.sum(list);
    const bulk = ui.bulk.on;
    const byDay = new Map();
    list.forEach((e) => { if (!byDay.has(e.purchaseDate)) byDay.set(e.purchaseDate, []); byDay.get(e.purchaseDate).push(e); });

    return `${monthBar(ui.ym)}
      ${filterBar(d, ui.filter)}
      <div class="row mb-2" style="justify-content:space-between">
        <div><div class="label" style="margin:0">${plural(list.length, 'lançamento', 'lançamentos')}</div><div class="strong num" style="font-size:1.3rem">${m(total)}</div></div>
        <div class="row" style="gap:6px">
          <button type="button" class="btn sm ghost" data-act="paste-import" title="Colar linhas de extrato"><i class="fas fa-paste"></i><span class="only-desktop">Colar extrato</span></button>
          ${list.length ? `<button type="button" class="btn sm ${bulk ? 'primary' : 'ghost'}" data-act="bulk-mode"><i class="fas ${bulk ? 'fa-xmark' : 'fa-check-double'}"></i>${bulk ? 'Cancelar' : 'Selecionar'}</button>` : ''}
        </div>
      </div>
      ${bulk ? `<div class="row mb-2"><button type="button" class="link-btn" data-act="bulk-all">Marcar todas</button><button type="button" class="link-btn" data-act="bulk-none">Desmarcar</button></div>` : ''}
      ${list.length ? [...byDay.entries()].map(([day, rows]) => `
        <div class="day-head"><span>${esc(friendlyDay(day))}</span><span class="num">${m(F.sum(rows))}</span></div>
        <div class="list">${rows.map((e) => expenseRow(d, e, { bulk, selected: ui.bulk.sel.has(e.groupId) })).join('')}</div>`).join('')
        : `<div class="card">${emptyState('tea', F.isFilterActive(ui.filter) ? 'Nada com esses filtros' : 'Mês tranquilo por aqui',
          F.isFilterActive(ui.filter) ? 'Tente limpar os filtros ou buscar outro termo.' : 'Nenhuma compra cai neste mês. Quando registrar, ela aparece aqui.',
          F.isFilterActive(ui.filter) ? '<button type="button" class="btn ghost" data-act="clear-filters">Limpar filtros</button>' : '<button type="button" class="btn primary" data-act="add-expense"><i class="fas fa-plus"></i>Nova compra</button>')}</div>`}
      ${bulk ? `<div class="bulkbar"><div class="grow strong small"><span style="color:var(--ui-accent)">${ui.bulk.sel.size}</span> selecionada(s)</div>
        <button type="button" class="icon-btn danger" data-act="bulk-trash" aria-label="Mover para a lixeira" ${ui.bulk.sel.size ? '' : 'disabled'}><i class="fas fa-trash"></i></button>
        <button type="button" class="btn sm primary" data-act="bulk-edit" ${ui.bulk.sel.size ? '' : 'disabled'}><i class="fas fa-pen-to-square"></i>Editar</button></div>` : ''}`;
  },
  mount(root, { ui, rerender }) {
    const input = root.querySelector('#flt-text');
    let t;
    input?.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        ui.filter.text = input.value.trim();
        const pos = input.selectionStart;
        rerender();
        const again = document.querySelector('#flt-text');
        again?.focus(); again?.setSelectionRange(pos, pos);
      }, 250);
    });
  },
  actions: {
    'open-filters': (_, { d, ui, rerender }) => openFilters(d, ui, rerender),
    'clear-filters': (_, { ui, rerender }) => { ui.filter = F.emptyFilter(); rerender(); },
    'bulk-mode': (_, { ui, rerender }) => { ui.bulk.on = !ui.bulk.on; ui.bulk.sel.clear(); rerender(); },
    'bulk-toggle': (el, { ui, rerender }) => {
      const g = el.dataset.gid;
      ui.bulk.sel.has(g) ? ui.bulk.sel.delete(g) : ui.bulk.sel.add(g);
      rerender();
    },
    'bulk-all': (_, { d, ui, rerender }) => { F.monthExpenses(d, ui.ym, { filter: ui.filter }).forEach((e) => ui.bulk.sel.add(e.groupId)); rerender(); },
    'bulk-none': (_, { ui, rerender }) => { ui.bulk.sel.clear(); rerender(); },
    'bulk-trash': (_, { ui }) => { const g = [...ui.bulk.sel]; ui.bulk.on = false; ui.bulk.sel.clear(); trashGroups(g); },
    'bulk-edit': (_, { d, ui, rerender }) => openBulkSheet(d, [...ui.bulk.sel], () => { ui.bulk.on = false; ui.bulk.sel.clear(); rerender(); }),
    'paste-import': (_, { d }) => openPasteSheet(d),
  },
};
