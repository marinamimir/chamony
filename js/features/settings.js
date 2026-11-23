// Ajustes: aparência (paleta, escuro, destaque, layout, tom), privacidade, limite, backup e importação.

import * as store from '../store.js';
import { esc, plural } from '../core/dom.js';
import { m } from '../core/money.js';
import { seg, toggle, sectionHead } from '../ui/parts.js';
import { openSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { openLimitSheet } from './budget.js';
import * as backup from '../data/backup.js';
import * as aero from '../data/aerosync.js';
import { mergeData, replaceData } from '../data/merge.js';
import { APP_VERSION } from '../version.js';

const PALETTES = [
  ['A', 'Paleta A', 'Azul-acinzentado e rosa (AeroSync)', ['#7484A0', '#FBEFF2', '#C7D0E0', '#F9C5D1']],
  ['B', 'Paleta B', 'Manteiga, sálvia e creme', ['#7A9672', '#FBF5E6', '#F3DC8C', '#CDEBC5']],
];

const countGroups = (list) => new Set((list || []).map((e) => e.groupId || e.id)).size;

function setSetting(key, value) { store.commit((s) => { s.settings[key] = value; }); }

// ---------------------------------------------------------------------------
// Importação: prévia e confirmação
// ---------------------------------------------------------------------------
function finishImport(result, origin) {
  const { data, stats } = result;
  data.meta.importedFrom = [...(data.meta.importedFrom || []), { origin, at: new Date().toISOString() }].slice(-20);
  store.replaceAll(data);
  const parts = [plural(stats.expenses, 'lançamento', 'lançamentos')];
  if (stats.cards) parts.push(plural(stats.cards, 'cartão', 'cartões'));
  if (stats.categories) parts.push(plural(stats.categories, 'categoria', 'categorias'));
  toast(`Importado: ${parts.join(' · ')}`, { action: { label: 'Desfazer', fn: () => { store.restorePrevious(); toast('Importação desfeita'); } }, duration: 7000 });
}

export function openAeroPreview(found) {
  const parts = aero.summarize(found);
  const pick = { full: !!found.full, simple: !found.full && !!found.simple };
  const render = () => `
    <div class="notice ok mb-3"><i class="fas fa-circle-check"></i><span>Encontrei dados do AeroSync (${esc(found.origin)}). Valores em reais serão convertidos para centavos, sem arredondar nada além do centavo.</span></div>
    ${parts.map((p) => `
      <div class="setting-row">
        <div><b>${esc(p.title)}</b>${p.lines.map((l) => `<small>${esc(l)}</small>`).join('')}</div>
        ${toggle(pick[p.key], 'x', p.title, `data-part="${p.key}"`)}
      </div>`).join('')}
    ${found.full && found.simple ? '<p class="tiny subtle mt-2">Os gastos rápidos são de um módulo antigo, separado. Importe os dois só se você usava os dois.</p>' : ''}
    <div class="divider"></div>
    <p class="small muted">Como importar?</p>`;
  openSheet({
    title: 'Importar do AeroSync',
    body: render(),
    foot: `<div class="stack">
      <button type="button" class="btn primary block" data-merge><i class="fas fa-code-merge"></i>Juntar com o que já tenho</button>
      <button type="button" class="btn ghost block" data-replace>Substituir meus dados financeiros</button>
      <p class="tiny subtle center">Reimportar o mesmo arquivo não duplica compras. Uma cópia do estado atual é guardada para desfazer.</p></div>`,
    onMount(el, api) {
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-part]');
        if (t) { pick[t.dataset.part] = !pick[t.dataset.part]; api.setBody(render()); return; }
        const merge = e.target.closest('[data-merge]'), replace = e.target.closest('[data-replace]');
        if (!merge && !replace) return;
        if (!pick.full && !pick.simple) { toast('Escolha ao menos uma parte para importar'); return; }
        const inc = aero.build(found, pick);
        if (replace && !(await confirmSheet({ title: 'Substituir dados?', text: 'Compras, cartões, contas e categorias atuais serão trocados pelos do AeroSync. Suas preferências continuam. Dá para desfazer logo em seguida.', confirm: 'Substituir', danger: true }))) return;
        finishImport(replace ? replaceData(store.get(), inc) : mergeData(store.get(), inc), found.origin);
        api.close();
      });
    },
  });
}

function openChamonyPreview(data, exportedAt) {
  const when = exportedAt ? new Date(exportedAt).toLocaleString('pt-BR') : 'data desconhecida';
  openSheet({
    title: 'Restaurar backup',
    body: `<div class="notice mb-3"><i class="fas fa-box-archive"></i><span>Backup do ChaMony de ${esc(when)}.</span></div>
      <div class="kv"><span>Compras</span><b>${countGroups(data.expenses)}</b></div>
      <div class="kv"><span>Cartões</span><b>${data.cards.length}</b></div>
      <div class="kv"><span>Categorias</span><b>${data.categories.length}</b></div>
      <div class="kv"><span>Contas</span><b>${data.banks.length}</b></div>
      <div class="kv"><span>Entradas extras</span><b>${data.incomes.length}</b></div>`,
    foot: `<div class="stack"><button type="button" class="btn primary block" data-replace>Restaurar (substitui tudo)</button>
      <button type="button" class="btn ghost block" data-merge>Juntar com o que já tenho</button></div>`,
    onMount(el, api) {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-replace]')) {
          store.replaceAll(data); api.close();
          toast('Backup restaurado', { action: { label: 'Desfazer', fn: () => store.restorePrevious() }, duration: 7000 });
        }
        if (e.target.closest('[data-merge]')) { finishImport(mergeData(store.get(), data), 'backup ChaMony'); api.close(); }
      });
    },
  });
}

async function handleFile(file) {
  if (!file) return;
  try {
    const res = backup.identify(await backup.readFileText(file));
    if (res.type === 'chamony') openChamonyPreview(res.data, res.exportedAt);
    else openAeroPreview(res.found);
  } catch (err) {
    toast(err.message || 'Não foi possível ler o arquivo');
  }
}

// ---------------------------------------------------------------------------
export default {
  id: 'ajustes',
  title: 'Ajustes',
  render({ d, query }) {
    const s = d.settings;
    const localAero = aero.readLocal();
    return `
      ${sectionHead('Aparência')}
      <section class="card">
        <span class="label">Paleta</span>
        <div class="stack mb-3">${PALETTES.map(([id, name, desc, sw]) => `
          <button type="button" class="pill block-pill" data-act="palette" data-value="${id}" aria-pressed="${s.palette === id}" style="width:100%;justify-content:flex-start;min-height:58px;border-radius:18px">
            <span class="swatch-pal">${sw.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>
            <span style="text-align:left"><b>${name}</b><br><small class="muted">${desc}</small></span></button>`).join('')}</div>
        <span class="label">Modo</span>
        <div class="mb-3">${seg('dark', [['system', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']], s.dark)}</div>
        <div class="setting-row"><div><b>Cor de destaque</b><small>${s.customAccent ? 'Personalizada' : 'A da paleta'}</small></div>
          <input type="color" id="accent-pick" value="${esc(s.customAccent || (s.palette === 'B' ? '#7A9672' : '#7484A0'))}" aria-label="Escolher cor de destaque" style="width:48px;height:40px;border:0;background:none;padding:0">
          ${s.customAccent ? '<button type="button" class="link-btn" data-act="accent-reset">Voltar</button>' : ''}</div>
        <div class="setting-row"><div><b>Animação de abertura</b><small>A flor desabrochando ao abrir</small></div>${toggle(s.splash, 'toggle-setting', 'Animação de abertura', 'data-key="splash"')}</div>
      </section>

      ${sectionHead('Tela inicial')}
      <section class="card">
        <span class="label">Layout</span>
        <div class="mb-3">${seg('layout', [['full', 'Painel completo'], ['airy', 'Tela respirada']], s.layout)}</div>
        <span class="label">Tom dos textos</span>
        <div class="mb-2">${seg('tone', [['warm', 'Acolhedor'], ['neutral', 'Neutro'], ['playful', 'Lúdico']], s.tone)}</div>
        <p class="tiny subtle">${s.tone === 'warm' ? 'Ex.: “Respira, ainda sobram R$ 300 este mês.”' : s.tone === 'neutral' ? 'Ex.: “Disponível no mês: R$ 300.”' : 'Ex.: “Sobram R$ 300 pra regar o jardim.”'}</p>
      </section>

      ${sectionHead('Privacidade e orçamento')}
      <section class="card">
        <div class="setting-row"><div><b>Abrir com valores escondidos</b><small>Mostre tocando no olho, no topo</small></div>${toggle(s.hideOnOpen, 'toggle-setting', 'Abrir com valores escondidos', 'data-key="hideOnOpen"')}</div>
        <div class="setting-row"><div><b>Limite do mês</b><small>${d.budget.monthlyLimit ? m(d.budget.monthlyLimit) : 'Desligado'}</small></div><button type="button" class="btn sm ghost" data-act="limit">Ajustar</button></div>
        <div class="setting-row"><div><b>Avisar faturas com antecedência</b><small>${s.dueWarnDays} dias antes do vencimento</small></div>
          <div class="row" style="gap:4px"><button type="button" class="icon-btn sm filled" data-act="warn-days" data-delta="-1" aria-label="Menos">−</button><button type="button" class="icon-btn sm filled" data-act="warn-days" data-delta="1" aria-label="Mais">+</button></div></div>
      </section>

      ${sectionHead('Seus dados')}
      <section class="card" id="dados">
        <p class="small muted mb-3"><i class="fas fa-lock" style="color:var(--ui-accent)"></i> Tudo fica só neste aparelho. Nada é enviado para servidor nenhum. Faça backup de vez em quando.</p>
        <div class="btn-row mb-3">
          <button type="button" class="btn primary" data-act="export"><i class="fas fa-download"></i>Exportar backup</button>
          ${backup.canShareFiles() ? '<button type="button" class="btn ghost" data-act="share" aria-label="Compartilhar backup"><i class="fas fa-share-nodes"></i>Enviar</button>' : ''}
        </div>
        <button type="button" class="btn ghost block" data-act="import-file"><i class="fas fa-file-import"></i>Importar arquivo (ChaMony ou AeroSync)</button>
        <input type="file" id="import-input" accept="application/json,.json" hidden>
        <p class="tiny subtle mt-2">“Enviar” abre o menu do Android: dá para salvar direto no Google Drive.</p>
      </section>

      <section class="card ${query?.has('importar') ? 'highlight' : ''}" id="aerosync">
        <div class="row mb-2"><img src="icons/logo.svg" alt="" width="34" height="34"><div class="grow"><b class="strong">Trazer do AeroSync</b><div class="tiny muted">Todas as abas de Finanças: compras, parcelas, cartões, salário, contas…</div></div></div>
        ${localAero
          ? `<div class="notice ok mb-3"><i class="fas fa-circle-check"></i><span>Encontrei o AeroSync neste navegador: ${esc(aero.summarize(localAero).map((p) => p.lines[0]).join(' · '))}.</span></div>
             <button type="button" class="btn primary block mb-2" data-act="import-local"><i class="fas fa-wand-magic-sparkles"></i>Importar direto do AeroSync</button>`
          : `<p class="small muted mb-3">O AeroSync não está neste mesmo endereço, então importe pelo arquivo: no AeroSync, abra <b>Ajustes → Exportar backup</b> e escolha o arquivo aqui.</p>`}
        <button type="button" class="btn ghost block" data-act="import-file"><i class="fas fa-file-import"></i>Escolher arquivo do AeroSync</button>
      </section>

      ${store.hasPrevious() ? `<section class="card soft row"><i class="fas fa-clock-rotate-left" style="color:var(--ui-accent)"></i>
        <p class="small grow">Existe uma cópia de antes da última importação ou restauração.</p><button type="button" class="btn sm ghost" data-act="undo-import">Voltar a ela</button></section>` : ''}

      ${sectionHead('Sobre')}
      <section class="card">
        <div class="row"><img src="icons/logo.svg" alt="" width="48" height="48"><div class="grow"><b class="strong">ChaMony</b> <span class="badge">v${APP_VERSION}</span>
          <p class="small muted">Dinheiro com calma, florescendo a prosperidade.</p></div></div>
        <div class="divider"></div>
        <div class="kv"><span>Espaço usado</span><b>${(store.storageSize() / 1024).toFixed(0)} KB</b></div>
        <button type="button" class="btn danger block mt-3" data-act="wipe"><i class="fas fa-eraser"></i>Apagar todos os dados</button>
      </section>`;
  },
  mount(root, { query }) {
    root.querySelector('#import-input')?.addEventListener('change', (e) => { handleFile(e.target.files[0]); e.target.value = ''; });
    let t;
    root.querySelector('#accent-pick')?.addEventListener('input', (e) => { clearTimeout(t); const v = e.target.value; t = setTimeout(() => setSetting('customAccent', v), 120); });
    if (query?.has('importar')) setTimeout(() => root.querySelector('#aerosync')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  },
  actions: {
    palette: (el) => store.commit((s) => { s.settings.palette = el.dataset.value; s.settings.customAccent = null; }),
    seg: (el) => setSetting(el.dataset.name, el.dataset.value),
    'accent-reset': () => setSetting('customAccent', null),
    'toggle-setting': (el) => setSetting(el.dataset.key, !store.get().settings[el.dataset.key]),
    limit: () => openLimitSheet(),
    'warn-days': (el) => setSetting('dueWarnDays', Math.min(15, Math.max(1, store.get().settings.dueWarnDays + Number(el.dataset.delta)))),
    export: () => { backup.downloadBackup(store.get()); toast('Backup exportado'); },
    share: async () => { try { await backup.shareBackup(store.get()); } catch (err) { if (err?.name !== 'AbortError') toast('Não foi possível compartilhar'); } },
    'import-file': (_, { root }) => root.querySelector('#import-input').click(),
    'import-local': () => { const f = aero.readLocal(); if (f) openAeroPreview(f); },
    'undo-import': async () => {
      if (await confirmSheet({ title: 'Voltar à cópia anterior?', text: 'Os dados atuais viram a nova cópia, então dá para trocar de volta.', confirm: 'Voltar' })) { store.restorePrevious(); toast('Dados anteriores restaurados'); }
    },
    wipe: async () => {
      if (!(await confirmSheet({ title: 'Apagar todos os dados?', text: 'Compras, cartões, contas e ajustes deste aparelho serão apagados. Uma última cópia fica guardada e dá para voltar logo depois, aqui nos Ajustes.', confirm: 'Apagar tudo', danger: true }))) return;
      store.replaceAll(store.defaults());
      toast('Dados apagados', { action: { label: 'Desfazer', fn: () => store.restorePrevious() }, duration: 8000 });
    },
  },
};
