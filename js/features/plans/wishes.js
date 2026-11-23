// Lista de desejos: prioridade, preço, link; simular, virar meta ou marcar como comprado.

import * as store from '../../store.js';
import { esc, uid, clampInt } from '../../core/dom.js';
import { m, attachMoneyMask } from '../../core/money.js';
import * as F from '../../core/finance.js';
import { chip } from '../../ui/parts.js';
import { emptyState } from '../../ui/illustrations.js';
import { openSheet, confirmSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { openExpenseForm } from '../expense-form.js';

const PRIO = { 3: 'Quero muito', 2: 'Quero', 1: 'Um dia' };
const prioIcons = (n) => `<span class="prio" aria-label="${PRIO[n]}">${'<i class="fas fa-star"></i>'.repeat(n)}</span>`;

function openWishForm(id = null) {
  const w = store.get().wishes.find((x) => x.id === id);
  let prio = w?.priority || 2;
  const prioPills = () => [3, 2, 1].map((n) => `<button type="button" class="pill" data-prio="${n}" aria-pressed="${prio === n}" style="--c:#F5CF7A">${prioIcons(n)} ${PRIO[n]}</button>`).join('');
  openSheet({
    title: w ? 'Editar desejo' : 'Novo desejo',
    body: `<label class="field"><span>O que você quer</span><input class="input" id="wf-name" maxlength="80" placeholder="Ex.: fone sem fio" value="${esc(w?.name || '')}" ${w ? '' : 'autofocus'}></label>
      <label class="field"><span>Preço aproximado</span><input class="input money" id="wf-price"></label>
      <span class="label">Prioridade</span><div class="pills wrap mb-3" id="wf-prio">${prioPills()}</div>
      <label class="field"><span>Link (opcional)</span><input class="input" id="wf-link" type="url" inputmode="url" placeholder="https://…" value="${esc(w?.link || '')}"></label>
      <label class="field"><span>Notas</span><textarea class="textarea" id="wf-note" maxlength="500" rows="2" placeholder="Cor, tamanho, onde vi…">${esc(w?.note || '')}</textarea></label>`,
    foot: `<div class="btn-row">${w ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir"><i class="fas fa-trash"></i></button>' : ''}<button type="button" class="btn primary" data-save>Salvar desejo</button></div>`,
    onMount(el, api) {
      const price = attachMoneyMask(el.querySelector('#wf-price'), w?.price || 0);
      el.addEventListener('click', async (e) => {
        const p = e.target.closest('[data-prio]'); if (p) { prio = Number(p.dataset.prio); el.querySelector('#wf-prio').innerHTML = prioPills(); }
        if (e.target.closest('[data-save]')) {
          const name = el.querySelector('#wf-name').value.trim();
          if (!name) { toast('Diga o que você quer'); return; }
          const link = el.querySelector('#wf-link').value.trim();
          const data = { name, price: price.get(), priority: clampInt(prio, 1, 3, 2), link: /^https?:\/\//i.test(link) ? link : '', note: el.querySelector('#wf-note').value.trim() };
          store.commit((s) => { const cur = s.wishes.find((x) => x.id === id); if (cur) Object.assign(cur, data); else s.wishes.push({ id: uid('w'), createdAt: new Date().toISOString(), boughtAt: null, ...data }); });
          api.close(); toast('Desejo salvo ✨');
        }
        if (e.target.closest('[data-del]')) {
          api.close();
          if (await confirmSheet({ title: `Tirar “${w.name}” da lista?`, text: 'O desejo será removido.', confirm: 'Remover', danger: true })) store.commit((s) => { s.wishes = s.wishes.filter((x) => x.id !== id); });
        }
      });
    },
  });
}

function openWishActions(id) {
  const w = store.get().wishes.find((x) => x.id === id);
  if (!w) return;
  const free = F.freeBalance(store.get(), new Date().toISOString().slice(0, 7));
  openSheet({
    title: w.name,
    body: `<div class="row mb-3">${chip('#FFF0B3', 'fa-wand-magic-sparkles', 'lg')}<div class="grow"><div class="strong num" style="font-size:1.3rem">${m(w.price)}</div>${prioIcons(w.priority)} <span class="tiny muted">${PRIO[w.priority]}</span></div></div>
      ${w.note ? `<p class="small muted mb-3">${esc(w.note)}</p>` : ''}
      ${w.link ? `<a class="btn ghost block mb-3" href="${esc(w.link)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-arrow-up-right-from-square"></i>Abrir link</a>` : ''}
      <div class="notice mb-3"><i class="fas fa-scale-balanced"></i><span>Saldo livre deste mês: ${m(free)}. ${w.price && free >= w.price ? 'Cabe no mês, se fizer sentido para você.' : 'Que tal transformar em meta e juntar aos pouquinhos?'}</span></div>
      <div class="stack">
        <button type="button" class="btn ghost block" data-to-goal><i class="fas fa-piggy-bank"></i>Virar meta de economia</button>
        <button type="button" class="btn ghost block" data-sim><i class="fas fa-calculator"></i>Simular parcelado</button>
        <button type="button" class="btn primary block" data-bought><i class="fas fa-bag-shopping"></i>Comprei! Registrar compra</button>
      </div>`,
    foot: '<button type="button" class="btn ghost block" data-edit><i class="fas fa-pen"></i>Editar</button>',
    onMount(el, api) {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-edit]')) { api.close(); openWishForm(id); }
        if (e.target.closest('[data-to-goal]')) {
          store.commit((s) => s.goals.push({ id: uid('goal'), name: w.name, target: w.price, deadline: '', color: '#FFF0B3', icon: 'fa-gift', createdAt: new Date().toISOString(), doneAt: null, deposits: [] }));
          api.close(); toast('Virou meta! Veja na aba Metas 🌱');
        }
        if (e.target.closest('[data-sim]')) {
          store.commit((s) => s.simItems.push({ id: uid('s'), name: w.name, total: w.price, inst: 1, rate: 0, ...F.simulate(w.price, 1, 0) }));
          api.close(); location.hash = '#/simulador'; toast('Adicionado ao Simulador. Ajuste as parcelas lá.');
        }
        if (e.target.closest('[data-bought]')) {
          store.commit((s) => { const x = s.wishes.find((y) => y.id === id); if (x) x.boughtAt = new Date().toISOString(); });
          api.close();
          openExpenseForm({ preset: { desc: w.name, amount: w.price } });
        }
      });
    },
  });
}

export const wishesTab = {
  title: 'Desejos', icon: 'fa-wand-magic-sparkles',
  render(d) {
    const open = d.wishes.filter((w) => !w.boughtAt).sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));
    const bought = d.wishes.filter((w) => w.boughtAt);
    const row = (w) => `<div class="list-row tap" role="button" tabindex="0" data-act="wish-open" data-id="${esc(w.id)}">
        ${chip(w.boughtAt ? '#CDEBC5' : '#FFF0B3', w.boughtAt ? 'fa-check' : 'fa-wand-magic-sparkles')}
        <div class="list-row__main"><div class="list-row__title">${esc(w.name)}</div><div class="list-row__meta">${w.boughtAt ? 'Realizado 🌼' : `${prioIcons(w.priority)} ${PRIO[w.priority]}`}</div></div>
        <div class="list-row__value">${m(w.price)}</div></div>`;
    return `<div class="grid-2 mb-3"><div class="stat"><span>Lista de desejos</span><b class="num">${m(F.sum(open, 'price'))}</b></div>
        <div class="stat"><span>Realizados</span><b>${bought.length}</b></div></div>
      ${open.length ? `<div class="list">${open.map(row).join('')}</div>` : `<div class="card">${emptyState('sprout', 'Nenhum desejo anotado', 'Anote o que você quer e decida com calma: simule, vire meta ou realize.')}</div>`}
      ${bought.length ? `<div class="section-head"><h2>Realizados</h2></div><div class="list">${bought.map(row).join('')}</div>` : ''}
      <button type="button" class="btn primary block mt-4" data-act="wish-new"><i class="fas fa-plus"></i>Novo desejo</button>`;
  },
  actions: {
    'wish-new': () => openWishForm(),
    'wish-open': (el) => openWishActions(el.dataset.id),
  },
};
