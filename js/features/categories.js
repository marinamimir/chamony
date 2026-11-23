// Categorias: criar, editar (nome, cor pastel, ícone), excluir. Compras antigas guardam uma "foto" da categoria.

import * as store from '../store.js';
import { esc, uid, safeColor } from '../core/dom.js';
import { m } from '../core/money.js';
import { CAT_COLORS, CAT_ICONS } from '../store.js';
import * as F from '../core/finance.js';
import { chip } from '../ui/parts.js';
import { openSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

export function openCategoryForm(catId = null) {
  const d = store.get();
  const c = d.categories.find((x) => x.id === catId);
  const st = { color: c?.color || CAT_COLORS[d.categories.length % CAT_COLORS.length], icon: c?.icon || 'fa-tag' };
  const picks = () => `
    <div class="row mb-3">${chip(st.color, st.icon, 'lg')}<span class="small muted">Prévia</span></div>
    <span class="label">Cor</span>
    <div class="pills wrap mb-3">${CAT_COLORS.map((x) => `<button type="button" class="color-pick" data-color="${x}" style="--c:${x}" aria-pressed="${st.color === x}" aria-label="Cor ${x}"></button>`).join('')}</div>
    <span class="label">Ícone</span>
    <div class="pills wrap">${CAT_ICONS.map((i) => `<button type="button" class="icon-pick" data-icon="${i}" aria-pressed="${st.icon === i}" aria-label="${i.replace('fa-', '')}"><i class="fas ${i}"></i></button>`).join('')}</div>`;
  openSheet({
    title: c ? 'Editar categoria' : 'Nova categoria',
    body: `<label class="field"><span>Nome</span><input class="input" id="cat-name" maxlength="40" placeholder="Ex.: Farmácia, Livros" value="${esc(c?.name || '')}" ${c ? '' : 'autofocus'}></label><div id="cat-picks">${picks()}</div>`,
    foot: `<div class="btn-row">${c ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir categoria"><i class="fas fa-trash"></i></button>' : ''}
      <button type="button" class="btn primary" data-save>${c ? 'Salvar' : 'Criar categoria'}</button></div>`,
    onMount(el, api) {
      el.addEventListener('click', async (e) => {
        const col = e.target.closest('[data-color]');
        if (col) { st.color = col.dataset.color; el.querySelector('#cat-picks').innerHTML = picks(); }
        const ic = e.target.closest('[data-icon]');
        if (ic) { st.icon = ic.dataset.icon; el.querySelector('#cat-picks').innerHTML = picks(); }
        if (e.target.closest('[data-save]')) {
          const name = el.querySelector('#cat-name').value.trim();
          if (!name) { toast('Dê um nome para a categoria'); return; }
          store.commit((s) => {
            const cur = s.categories.find((x) => x.id === catId);
            if (cur) {
              Object.assign(cur, { name, ...st });
              // Atualiza a "foto" guardada nas compras desta categoria.
              s.expenses.concat(s.trash).forEach((x) => { if (x.catId === cur.id) x.catSnap = F.catSnapshot(cur); });
            } else s.categories.push({ id: uid('c'), name, ...st });
          });
          api.close(); toast(c ? 'Categoria atualizada' : 'Categoria criada');
        }
        if (e.target.closest('[data-del]')) {
          if (store.get().categories.length <= 1) { toast('Mantenha ao menos uma categoria'); return; }
          const n = new Set(store.get().expenses.filter((x) => x.catId === catId).map((x) => x.groupId)).size;
          api.close();
          const ok = await confirmSheet({ title: `Excluir “${c.name}”?`, text: n ? `${n} compra(s) continuam com o nome desta categoria no histórico.` : 'Nenhuma compra usa esta categoria.', confirm: 'Excluir', danger: true });
          if (ok) { store.commit((s) => { s.categories = s.categories.filter((x) => x.id !== catId); }); toast('Categoria excluída'); }
        }
      });
    },
  });
}

export default {
  id: 'categorias',
  title: 'Categorias',
  render({ d, ui }) {
    const month = F.byCategory(d, F.monthExpenses(d, ui.ym));
    const sumOf = (id) => month.find((x) => x.id === id)?.sum || 0;
    return `<p class="page-sub">Toque para editar. As cores pastel aparecem nos gráficos.</p>
      <div class="list">${d.categories.map((c) => `
        <div class="list-row tap" role="button" tabindex="0" data-act="edit-cat" data-id="${esc(c.id)}">
          ${chip(c.color, c.icon)}
          <div class="list-row__main"><div class="list-row__title">${esc(c.name)}</div><div class="list-row__meta">Neste mês</div></div>
          <div class="list-row__value">${m(sumOf(c.id))}</div>
          <i class="fas fa-chevron-right subtle"></i>
        </div>`).join('')}</div>
      <button type="button" class="btn ghost block mt-4" data-act="new-cat"><i class="fas fa-plus"></i>Nova categoria</button>`;
  },
  actions: {
    'new-cat': () => openCategoryForm(),
    'edit-cat': (el) => openCategoryForm(el.dataset.id),
  },
};
