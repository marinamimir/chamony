// Aparência: paletas prontas, paletas próprias (editor com prévia ao vivo) e fundo do app.

import * as store from '../store.js';
import { esc, uid, isColor } from '../core/dom.js';
import { PRESETS, resolvePalette, onColor } from '../ui/palettes.js';
import { applyPalette, reapply, isDark } from '../ui/theme.js';
import { openSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

const BGS = [['plain', 'Liso'], ['gradient', 'Gradiente'], ['dots', 'Bolinhas'], ['flowers', 'Florzinhas']];

/** Miniatura de paleta: fundo, cartão e destaque. */
function swatchTile(p, { selected, act, id, label, sub }) {
  return `<button type="button" class="pal-tile" data-act="${act}" data-id="${esc(id)}" aria-pressed="${selected}" aria-label="${esc(label)}">
    <span class="pal-tile__prev" style="background:${p.page}">
      <span class="pal-tile__card" style="background:${p.surface}"><i style="background:${p.accent}"></i><i style="background:${p.accent2 || p.accent};opacity:.5"></i></span>
      <span class="pal-tile__dot" style="background:${p.accent};color:${onColor(p.accent)}">${selected ? '<i class="fas fa-check"></i>' : ''}</span>
    </span>
    <span class="pal-tile__name">${esc(label)}</span>${sub ? `<span class="pal-tile__sub">${esc(sub)}</span>` : ''}
  </button>`;
}

export function appearanceSection(d) {
  const t = d.settings.theme;
  return `
    <span class="label">Paletas prontas</span>
    <div class="pal-grid mb-3">${PRESETS.map((p) => swatchTile(p, { selected: t.preset === p.id, act: 'pick-preset', id: p.id, label: p.name })).join('')}</div>
    <div class="row" style="justify-content:space-between"><span class="label">Minhas paletas</span>
      <button type="button" class="link-btn" data-act="new-palette"><i class="fas fa-plus"></i> Criar</button></div>
    ${t.customs.length ? `<div class="pal-grid mb-3">${t.customs.map((c) => swatchTile(c, { selected: t.preset === `custom:${c.id}`, act: 'pick-custom', id: c.id, label: c.name, sub: t.preset === `custom:${c.id}` ? 'toque para editar' : '' })).join('')}</div>`
      : '<p class="tiny subtle mb-3">Monte uma paleta com as suas cores: destaque, fundo, cartões e ícones.</p>'}
    <span class="label">Fundo do app</span>
    <div class="pal-bgs mb-3">${BGS.map(([id, name]) => `<button type="button" class="pal-bg" data-act="pick-bg" data-id="${id}" data-bgprev="${id}" aria-pressed="${t.bg === id}"><span></span>${name}</button>`).join('')}</div>`;
}

/** Editor de paleta própria. Mostra a mudança no app inteiro enquanto edita. */
export function openPaletteEditor(id = null) {
  const d = store.get();
  const base = id ? d.settings.theme.customs.find((c) => c.id === id) : null;
  const from = resolvePalette(d.settings.theme);
  const st = base ? { ...base } : { name: '', accent: from.accent, page: from.page, surface: from.surface, icon: from.icon || from.accent };
  const dark = isDark(d.settings);
  let saved = false;
  const fields = [['accent', 'Destaque', 'Botões, anel e gráficos'], ['page', 'Fundo', 'Atrás de tudo'], ['surface', 'Cartões', 'Superfície dos cartões e listas'], ['icon', 'Ícones', 'Ícones do topo e menus']];
  const preview = () => applyPalette(st, dark);

  openSheet({
    title: base ? 'Editar paleta' : 'Nova paleta',
    body: `<label class="field"><span>Nome</span><input class="input" id="pe-name" maxlength="30" placeholder="Ex.: Minha camomila" value="${esc(st.name)}"></label>
      ${fields.map(([k, label, hint]) => `
        <label class="setting-row" style="cursor:pointer">
          <div><b>${label}</b><small>${hint}</small></div>
          <span class="pe-swatch" style="--c:${st[k]}"><input type="color" data-k="${k}" value="${st[k]}" aria-label="${label}"></span>
        </label>`).join('')}
      <p class="tiny subtle mt-2">${dark ? 'No modo escuro o app usa uma versão escura destas cores, criada automaticamente.' : 'O modo escuro usa uma versão escura destas cores, criada automaticamente.'}</p>`,
    foot: `<div class="btn-row">${base ? '<button type="button" class="btn danger" data-del style="flex:0 0 auto" aria-label="Excluir paleta"><i class="fas fa-trash"></i></button>' : ''}
      <button type="button" class="btn primary" data-save>Usar esta paleta</button></div>`,
    onMount(el, api) {
      preview();
      el.addEventListener('input', (e) => {
        const k = e.target.dataset?.k;
        if (!k || !isColor(e.target.value)) return;
        st[k] = e.target.value;
        e.target.parentElement.style.setProperty('--c', st[k]);
        preview();
      });
      el.querySelector('[data-save]').addEventListener('click', () => {
        st.name = el.querySelector('#pe-name').value.trim() || 'Minha paleta';
        saved = true;
        store.commit((s) => {
          const list = s.settings.theme.customs;
          const cur = list.find((c) => c.id === id);
          const data = { name: st.name, accent: st.accent, page: st.page, surface: st.surface, icon: st.icon };
          let pid = id;
          if (cur) Object.assign(cur, data);
          else { pid = uid('p'); list.push({ id: pid, ...data }); }
          s.settings.theme.preset = `custom:${pid}`;
        });
        api.close(); toast('Paleta aplicada 🌼');
      });
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        saved = true; api.close();
        if (await confirmSheet({ title: `Excluir “${base.name}”?`, text: 'Se ela estiver em uso, o app volta para a Camomila.', confirm: 'Excluir', danger: true })) {
          store.commit((s) => {
            s.settings.theme.customs = s.settings.theme.customs.filter((c) => c.id !== id);
            if (s.settings.theme.preset === `custom:${id}`) s.settings.theme.preset = 'camomila';
          });
        } else reapply();
      });
    },
    onClose() { if (!saved) reapply(); },
  });
}

export const appearanceActions = {
  'pick-preset': (el) => store.commit((s) => { s.settings.theme.preset = el.dataset.id; }),
  // Primeiro toque usa a paleta; tocar de novo na paleta em uso abre o editor.
  'pick-custom': (el) => {
    const id = el.dataset.id;
    if (store.get().settings.theme.preset === `custom:${id}`) openPaletteEditor(id);
    else store.commit((s) => { s.settings.theme.preset = `custom:${id}`; });
  },
  'new-palette': () => openPaletteEditor(),
  'pick-bg': (el) => store.commit((s) => { s.settings.theme.bg = el.dataset.id; }),
};
