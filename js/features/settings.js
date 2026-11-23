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
import { appearanceSection, appearanceActions } from './appearance.js';
import * as reminders from '../data/reminders.js';
import { feedback } from '../ui/feedback.js';

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

function openChamonyPreview(res) {
  const { data, exportedAt, receipts } = res;
  const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'desconhecida');
  const local = store.get().meta.updatedAt;
  const fileNewer = exportedAt && (!local || exportedAt > local);
  const isSync = res.kind === 'sync';
  const markSync = () => store.commit((s) => { s.settings.lastSyncAt = new Date().toISOString(); });
  openSheet({
    title: isSync ? 'Puxar sincronização' : 'Restaurar backup',
    body: `<div class="notice mb-3"><i class="fas fa-box-archive"></i><span>Arquivo do ChaMony salvo em <b>${esc(fmtDT(exportedAt))}</b>. Última alteração neste aparelho: <b>${esc(fmtDT(local))}</b>.</span></div>
      ${isSync ? `<p class="small muted mb-3">${fileNewer ? 'O arquivo é <b>mais novo</b>: o recomendado é usar o arquivo.' : 'Este aparelho tem alterações <b>mais novas</b> que o arquivo. Juntar mantém tudo daqui e só acrescenta o que faltar.'}</p>` : ''}
      <div class="kv"><span>Compras</span><b>${countGroups(data.expenses)}</b></div>
      <div class="kv"><span>Cartões · categorias · contas</span><b>${data.cards.length} · ${data.categories.length} · ${data.banks.length}</b></div>
      <div class="kv"><span>Metas · assinaturas · investimentos</span><b>${data.goals.length} · ${data.subscriptions.length} · ${data.investments.length}</b></div>
      <div class="kv"><span>Fotos de comprovante</span><b>${receipts.length}</b></div>`,
    foot: `<div class="stack"><button type="button" class="btn ${!isSync || fileNewer ? 'primary' : 'ghost'} block" data-replace>${isSync ? 'Usar o arquivo (substitui este aparelho)' : 'Restaurar (substitui tudo)'}</button>
      <button type="button" class="btn ${isSync && !fileNewer ? 'primary' : 'ghost'} block" data-merge>Juntar com o que já tenho</button>
      <p class="tiny subtle center">Juntar só acrescenta o que falta: edições e exclusões feitas no outro aparelho não passam. Dá para desfazer logo depois.</p></div>`,
    onMount(el, api) {
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-replace]')) {
          api.close();
          await backup.restoreReceipts(receipts);
          store.replaceAll(data);
          if (isSync) markSync();
          toast(isSync ? 'Sincronizado com o arquivo' : 'Backup restaurado', { action: { label: 'Desfazer', fn: () => store.restorePrevious() }, duration: 7000 });
        }
        if (e.target.closest('[data-merge]')) {
          api.close();
          await backup.restoreReceipts(receipts);
          finishImport(mergeData(store.get(), data), isSync ? 'sincronização' : 'backup ChaMony');
          if (isSync) markSync();
        }
      });
    },
  });
}

async function handleFile(file) {
  if (!file) return;
  try {
    const res = backup.identify(await backup.readFileText(file));
    if (res.type === 'chamony') openChamonyPreview(res);
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
        ${appearanceSection(d)}
        <span class="label">Modo</span>
        <div class="mb-3">${seg('dark', [['system', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']], s.dark)}</div>
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

      ${sectionHead('Jeitinho do app')}
      <section class="card">
        <span class="label">Adicionar gasto pelo +</span>
        <div class="mb-3">${seg('addMode', [['modal', 'Formulário completo'], ['keypad', 'Teclado rápido']], s.addMode)}</div>
        <span class="label">Ícones</span>
        <div class="mb-3">${seg('iconSet', [['fa', 'Clássicos'], ['own', 'Arredondados']], s.iconSet)}</div>
        <span class="label">Conquistas</span>
        <div class="mb-3">${seg('achievements', [['badges', 'Selos e níveis'], ['garden', 'Jardim'], ['both', 'Os dois']], s.achievements)}</div>
        <div class="setting-row"><div><b>Sons suaves</b><small>Sininhos ao salvar e nas conquistas</small></div>${toggle(s.sound, 'toggle-setting', 'Sons suaves', 'data-key="sound"')}</div>
        <div class="setting-row"><div><b>Vibração</b><small>Toque leve ao salvar e no teclado</small></div>${toggle(s.vibration, 'toggle-setting', 'Vibração', 'data-key="vibration"')}</div>
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

      ${sectionHead('Sincronizar com outro aparelho')}
      <section class="card">
        <p class="small muted mb-3">Use uma pasta do Google Drive como ponte: <b>Enviar</b> aqui e <b>Puxar</b> no outro aparelho (e vice-versa). É sempre manual: o navegador não acessa o Drive sozinho.</p>
        <div class="btn-row mb-2"><button type="button" class="btn ghost" data-act="sync-push"><i class="fas fa-cloud-arrow-up"></i>Enviar</button>
          <button type="button" class="btn ghost" data-act="sync-pull"><i class="fas fa-cloud-arrow-down"></i>Puxar</button></div>
        <p class="tiny subtle">${s.lastSyncAt ? `Última sincronização: ${esc(new Date(s.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}` : 'Ainda não sincronizado.'}</p>
      </section>

      ${sectionHead('Lembretes no celular')}
      <section class="card">
        <div class="setting-row"><div><b>Avisar vencimentos</b><small>Faturas, contas, assinaturas e dívidas, com a antecedência que você escolheu</small></div>
          ${toggle(s.notifications && reminders.support().permission === 'granted', 'notif-toggle', 'Avisar vencimentos')}</div>
        ${s.notifications ? `<p class="tiny subtle mt-2">${reminders.support().periodic ? 'O Android confere os vencimentos cerca de 1 vez por dia (o horário exato é decidido pelo Chrome) e também quando você abre o app.' : 'Os avisos chegam quando você abre o app. Instale o ChaMony (menu ⋮ → Instalar app) para receber também em segundo plano.'}</p>
          <button type="button" class="btn sm ghost mt-2" data-act="notif-test"><i class="fas fa-bell"></i>Testar notificação</button>` : ''}
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
    if (query?.has('importar')) setTimeout(() => root.querySelector('#aerosync')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  },
  actions: {
    ...appearanceActions,
    seg: (el) => setSetting(el.dataset.name, el.dataset.value),
    'toggle-setting': (el) => {
      const key = el.dataset.key;
      setSetting(key, !store.get().settings[key]);
      if (key === 'sound' || key === 'vibration') feedback('save');
    },
    limit: () => openLimitSheet(),
    'warn-days': (el) => setSetting('dueWarnDays', Math.min(15, Math.max(1, store.get().settings.dueWarnDays + Number(el.dataset.delta)))),
    export: async () => { await backup.downloadBackup(store.get()); toast('Backup exportado'); },
    share: async () => { try { await backup.shareBackup(store.get()); } catch (err) { if (err?.name !== 'AbortError') toast('Não foi possível compartilhar'); } },
    'sync-push': async () => {
      try {
        const shared = backup.canShareFiles() ? await backup.shareBackup(store.get(), 'sync') : false;
        if (!shared) await backup.downloadBackup(store.get(), 'sync');
        store.commit((s) => { s.settings.lastSyncAt = new Date().toISOString(); });
        toast(shared ? 'Escolha o Drive e a mesma pasta de sempre' : 'Arquivo de sincronização salvo em Downloads');
      } catch (err) { if (err?.name !== 'AbortError') toast('Não foi possível gerar o arquivo'); }
    },
    'sync-pull': (_, { root }) => root.querySelector('#import-input').click(),
    'notif-toggle': async (el, { rerender }) => {
      const on = !store.get().settings.notifications;
      if (on) {
        const r = await reminders.enable();
        toast(r.msg, { duration: 6000 });
        if (!r.ok) return;
      } else await reminders.disable();
      store.commit((s) => { s.settings.notifications = on; });
      await reminders.writeReminders(store.get());
      if (on) reminders.checkNow();
      rerender();
    },
    'notif-test': async () => { try { await reminders.testNotification(); } catch { toast('Não foi possível mostrar a notificação'); } },
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
