// Metas de economia: valor-alvo, prazo opcional, depósitos e retiradas.

import * as store from '../../store.js';
import { esc, uid, safeColor } from '../../core/dom.js';
import { m, fmt, attachMoneyMask } from '../../core/money.js';
import { todayISO, shortDate, daysBetween, isISO } from '../../core/dates.js';
import { CAT_COLORS } from '../../store.js';
import { chip, colorPicks, bindFreeColor } from '../../ui/parts.js';
import { ring } from '../../ui/charts.js';
import { emptyState } from '../../ui/illustrations.js';
import { openSheet, confirmSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { celebrate } from '../../ui/feedback.js';

const GOAL_ICONS = ['fa-piggy-bank', 'fa-plane', 'fa-house', 'fa-car', 'fa-graduation-cap', 'fa-gift', 'fa-umbrella-beach', 'fa-heart', 'fa-shield-heart', 'fa-mobile-screen', 'fa-paw', 'fa-seedling'];

export const goalSaved = (g) => g.deposits.reduce((s, x) => s + x.amount, 0);

/** Quanto guardar por mês para chegar no prazo. */
export function monthlyNeeded(g) {
  const left = g.target - goalSaved(g);
  if (!g.deadline || left <= 0) return 0;
  const months = Math.max(1, Math.ceil(daysBetween(todayISO(), g.deadline) / 30.4));
  return Math.ceil(left / months);
}

function openGoalForm(id = null) {
  const g = store.get().goals.find((x) => x.id === id);
  const st = { color: g?.color || CAT_COLORS[store.get().goals.length % CAT_COLORS.length], icon: g?.icon || 'fa-piggy-bank' };
  const picks = () => `
    <span class="label">Cor</span><div class="pills wrap mb-3">${colorPicks(CAT_COLORS, st.color)}</div>
    <span class="label">Ícone</span><div class="pills wrap">${GOAL_ICONS.map((i) => `<button type="button" class="icon-pick" data-icon="${i}" aria-pressed="${st.icon === i}"><i class="fas ${i}"></i></button>`).join('')}</div>`;
  openSheet({
    title: g ? 'Editar meta' : 'Nova meta',
    body: `<label class="field"><span>Nome</span><input class="input" id="gf-name" maxlength="80" placeholder="Ex.: viagem, reserva de emergência" value="${esc(g?.name || '')}" ${g ? '' : 'autofocus'}></label>
      <label class="field"><span>Quanto quer juntar</span><input class="input money" id="gf-target"></label>
      <label class="field"><span>Até quando (opcional)</span><input class="input" type="date" id="gf-date" value="${esc(g?.deadline || '')}"></label>
      <div id="gf-picks">${picks()}</div>`,
    foot: `<div class="btn-row">${g ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir meta"><i class="fas fa-trash"></i></button>' : ''}<button type="button" class="btn primary" data-save>${g ? 'Salvar' : 'Criar meta'}</button></div>`,
    onMount(el, api) {
      const target = attachMoneyMask(el.querySelector('#gf-target'), g?.target || 0);
      const re = () => { el.querySelector('#gf-picks').innerHTML = picks(); };
      bindFreeColor(el, (c) => { st.color = c; re(); });
      el.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-color]'); if (c) { st.color = c.dataset.color; re(); }
        const i = e.target.closest('[data-icon]'); if (i) { st.icon = i.dataset.icon; re(); }
        if (e.target.closest('[data-save]')) {
          const name = el.querySelector('#gf-name').value.trim();
          if (!name || !(target.get() > 0)) { toast('Preencha o nome e o valor da meta'); return; }
          const date = el.querySelector('#gf-date').value;
          store.commit((s) => {
            const data = { name, target: target.get(), deadline: isISO(date) ? date : '', ...st };
            const cur = s.goals.find((x) => x.id === id);
            if (cur) Object.assign(cur, data); else s.goals.push({ id: uid('goal'), createdAt: new Date().toISOString(), doneAt: null, deposits: [], ...data });
          });
          api.close(); toast(g ? 'Meta atualizada' : 'Meta plantada 🌱');
        }
        if (e.target.closest('[data-del]')) {
          api.close();
          if (await confirmSheet({ title: `Excluir “${g.name}”?`, text: 'O histórico de depósitos desta meta também some.', confirm: 'Excluir', danger: true })) {
            store.commit((s) => { s.goals = s.goals.filter((x) => x.id !== id); });
          }
        }
      });
    },
  });
}

function openGoalDetail(id) {
  const g0 = store.get().goals.find((x) => x.id === id);
  if (!g0) return;
  const body = (g) => {
    const saved = goalSaved(g);
    const need = monthlyNeeded(g);
    return `<div class="ring-wrap mb-3">${ring(g.target ? saved / g.target : 0, { label: g.name, color: 'var(--ui-success)' })}
        <div class="grow"><div class="strong num" style="font-size:1.3rem">${m(saved)}</div><div class="small muted">de ${m(g.target)}</div>
        ${g.deadline ? `<p class="tiny muted mt-2">Prazo: ${esc(shortDate(g.deadline))}${need ? ` · guarde ${m(need)}/mês` : ''}</p>` : ''}</div></div>
      <label class="field"><span>Valor</span><input class="input money" id="gd-val"></label>
      <div class="btn-row mb-3"><button type="button" class="btn ghost" data-move="-1"><i class="fas fa-minus"></i>Retirar</button>
        <button type="button" class="btn primary" data-move="1"><i class="fas fa-plus"></i>Guardar</button></div>
      <span class="label">Histórico</span>
      ${g.deposits.length ? `<div class="list">${[...g.deposits].reverse().map((x) => `
        <div class="list-row" style="min-height:52px"><div class="list-row__main"><div class="list-row__title">${x.amount >= 0 ? 'Guardado' : 'Retirado'}</div><div class="list-row__meta">${esc(shortDate(x.date))}</div></div>
          <div class="list-row__value ${x.amount >= 0 ? 'pos' : 'neg'}">${x.amount >= 0 ? '+' : '−'}${m(Math.abs(x.amount))}</div>
          <button type="button" class="icon-btn sm danger" data-undo="${esc(x.id)}" aria-label="Apagar movimento"><i class="fas fa-xmark"></i></button></div>`).join('')}</div>`
        : '<p class="small muted">Nenhum depósito ainda. Cada pouquinho conta.</p>'}`;
  };
  openSheet({
    title: g0.name,
    body: body(g0),
    foot: '<button type="button" class="btn ghost block" data-edit><i class="fas fa-pen"></i>Editar meta</button>',
    onMount(el, api) {
      let money = attachMoneyMask(el.querySelector('#gd-val'), 0);
      el.addEventListener('click', (e) => {
        const mv = e.target.closest('[data-move]');
        const undo = e.target.closest('[data-undo]');
        if (e.target.closest('[data-edit]')) { api.close(); openGoalForm(id); return; }
        if (!mv && !undo) return;
        let reached = false;
        store.commit((s) => {
          const g = s.goals.find((x) => x.id === id);
          if (mv) {
            if (!(money.get() > 0)) return;
            g.deposits.push({ id: uid('m'), date: todayISO(), amount: money.get() * Number(mv.dataset.move), note: '' });
          } else g.deposits = g.deposits.filter((x) => x.id !== undo.dataset.undo);
          const done = goalSaved(g) >= g.target;
          reached = done && !g.doneAt;
          g.doneAt = done ? (g.doneAt || new Date().toISOString()) : null;
        });
        api.setBody(body(store.get().goals.find((x) => x.id === id)));
        money = attachMoneyMask(el.querySelector('#gd-val'), 0);
        if (reached) celebrate('Meta alcançada! 🌼', `Você juntou ${fmt(store.get().goals.find((x) => x.id === id).target)}.`);
      });
    },
  });
}

export const goalsTab = {
  title: 'Metas', icon: 'fa-piggy-bank',
  render(d) {
    const active = d.goals.filter((g) => !g.doneAt), done = d.goals.filter((g) => g.doneAt);
    const saved = d.goals.reduce((s, g) => s + goalSaved(g), 0);
    const card = (g) => {
      const s = goalSaved(g), pct = g.target ? Math.min(1, s / g.target) : 0, need = monthlyNeeded(g);
      return `<button type="button" class="card goal-card" data-act="goal-open" data-id="${esc(g.id)}">
        <div class="row">${chip(g.color, g.icon)}<div class="grow" style="text-align:left"><div class="card-title truncate">${esc(g.name)}</div>
          <div class="tiny muted">${g.doneAt ? 'Concluída 🌼' : g.deadline ? `até ${esc(shortDate(g.deadline))}${need ? ` · ${fmt(need)}/mês` : ''}` : 'sem prazo'}</div></div>
          <b class="small">${Math.round(pct * 100)}%</b></div>
        <div class="bar mt-3"><i style="width:${pct * 100}%;--c:${safeColor(g.color)}"></i></div>
        <div class="row mt-2" style="justify-content:space-between"><span class="small strong">${m(s)}</span><span class="tiny muted">de ${m(g.target)}</span></div>
      </button>`;
    };
    return `<div class="grid-2 mb-3"><div class="stat"><span>Guardado em metas</span><b class="num">${m(saved)}</b></div>
        <div class="stat"><span>Em andamento · batidas</span><b>${active.length} · ${done.length}</b></div></div>
      ${d.goals.length ? `<div class="grid-cards two">${active.map(card).join('')}</div>
        ${done.length ? `<div class="section-head"><h2>Concluídas</h2></div><div class="grid-cards two">${done.map(card).join('')}</div>` : ''}`
        : `<div class="card">${emptyState('garden', 'Plante sua primeira meta', 'Viagem, reserva, presente… Defina um valor e vá guardando aos pouquinhos.')}</div>`}
      <button type="button" class="btn primary block mt-4" data-act="goal-new"><i class="fas fa-plus"></i>Nova meta</button>`;
  },
  actions: {
    'goal-new': () => openGoalForm(),
    'goal-open': (el) => openGoalDetail(el.dataset.id),
  },
};

export { openGoalForm };
