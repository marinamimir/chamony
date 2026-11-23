// Bottom sheet (celular) / modal centralizado (desktop).
// - Arrastar para baixo fecha; tocar fora fecha; Esc fecha.
// - O botão "voltar" do Android fecha a folha (usa uma entrada no histórico).

import { esc } from '../core/dom.js';

const stack = [];
const idle = []; // ações esperando todas as folhas fecharem

/** Roda fn quando não houver nenhuma folha aberta (ex.: comemorar conquista depois de salvar). */
export function whenIdle(fn) {
  if (!stack.length) fn(); else idle.push(fn);
}
let ownBacks = 0; // history.back() chamados por nós (não devem fechar outra folha)

window.addEventListener('popstate', () => {
  if (ownBacks > 0) { ownBacks -= 1; return; }
  const top = stack[stack.length - 1];
  if (top && !top.closing) top.close({ fromHistory: true });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close();
});

/**
 * @param {object} o
 * @param {string} o.title
 * @param {string} o.body   HTML do conteúdo
 * @param {string} [o.foot] HTML do rodapé fixo (botões)
 * @param {(el: HTMLElement, api: object) => void} [o.onMount]
 * @param {() => void} [o.onClose]
 */
export function openSheet({ title, body, foot = '', onMount, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const el = document.createElement('section');
  el.className = 'sheet';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', title);
  el.innerHTML = `
    <div class="sheet__grip" aria-hidden="true"></div>
    <header class="sheet__head">
      <h2 class="sheet__title">${esc(title)}</h2>
      <button type="button" class="icon-btn sm" data-sheet-close aria-label="Fechar"><i class="fas fa-xmark"></i></button>
    </header>
    <div class="sheet__body">${body}</div>
    ${foot ? `<footer class="sheet__foot">${foot}</footer>` : ''}`;
  document.body.append(backdrop, el);

  const prevFocus = document.activeElement;
  const api = {
    el, closing: false,
    close({ fromHistory = false } = {}) {
      if (api.closing) return;
      api.closing = true;
      el.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      const i = stack.indexOf(api);
      if (i >= 0) stack.splice(i, 1);
      if (!fromHistory && history.state?.sheet) { ownBacks += 1; history.back(); }
      setTimeout(() => { el.remove(); backdrop.remove(); }, 360);
      if (!stack.length) {
        document.body.style.overflow = '';
        if (idle.length) { const next = idle.shift(); setTimeout(() => whenIdle(next), 420); }
      }
      prevFocus?.focus?.({ preventScroll: true });
      onClose?.();
    },
    setBody(html) { el.querySelector('.sheet__body').innerHTML = html; },
  };
  stack.push(api);
  history.pushState({ sheet: true }, '');
  document.body.style.overflow = 'hidden';

  backdrop.addEventListener('click', () => api.close());
  el.addEventListener('click', (e) => { if (e.target.closest('[data-sheet-close]')) api.close(); });
  enableDrag(el, api);

  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    el.classList.add('is-open');
  });
  onMount?.(el, api);
  const first = el.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 320);
  return api;
}

function enableDrag(el, api) {
  let startY = null, dy = 0;
  const handles = [el.querySelector('.sheet__grip'), el.querySelector('.sheet__head')];
  const onDown = (e) => {
    if (window.matchMedia('(min-width: 900px)').matches || e.target.closest('button')) return;
    startY = e.clientY; dy = 0;
    el.classList.add('is-dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (startY === null) return;
    dy = Math.max(0, e.clientY - startY);
    el.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    if (startY === null) return;
    startY = null;
    el.classList.remove('is-dragging');
    el.style.transform = '';
    if (dy > 110) api.close();
  };
  handles.forEach((h) => {
    h.addEventListener('pointerdown', onDown);
    h.addEventListener('pointermove', onMove);
    h.addEventListener('pointerup', onUp);
    h.addEventListener('pointercancel', onUp);
  });
}

/** Confirmação suave. Resolve true/false. */
export function confirmSheet({ title, text, confirm = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      body: `<p class="muted" style="font-weight:600">${text}</p>`,
      foot: `<div class="btn-row"><button type="button" class="btn ghost" data-sheet-close>Cancelar</button>
             <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(confirm)}</button></div>`,
      onMount(el, api) {
        el.querySelector('[data-ok]').addEventListener('click', () => { answered = true; resolve(true); api.close(); });
      },
      onClose() { if (!answered) resolve(false); },
    });
  });
}
