// Importar extrato do banco: escolher arquivo → (senha) → revisar (categoria, duplicados, parcelas) → confirmar.
// Tudo acontece no aparelho: o arquivo não é enviado para lugar nenhum e não é guardado.

import * as store from '../store.js';
import { esc, uid, safeColor, safeIcon, plural } from '../core/dom.js';
import { m, fmt } from '../core/money.js';
import { shortDate, formatYM, shiftYM } from '../core/dates.js';
import { ACCENT_COLORS } from '../store.js';
import { readFile, pickParser, buildReview, applyImport, descKey, OTHER_CAT, nameKey, sameName } from '../import/pipeline.js';
import { PasswordNeeded } from '../import/pdf.js';
import { PARSERS } from '../import/parser.js';
import { chip } from '../ui/parts.js';
import { emptyState } from '../ui/illustrations.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { feedback } from '../ui/feedback.js';

let session = null; // { parser, parsed, review, cardChoice, busy, fileName }

const SUPPORTED = [
  ['Itaú', 'Extrato da conta corrente (PDF)', true],
  ['Itaú', 'Fatura do cartão (PDF)', true],
  ['Nubank', 'Extrato da conta (CSV)', true],
  ['Nubank', 'Fatura do cartão (CSV)', true],
  ['Itaú', 'CSV', false],
];

function askPassword(wrong) {
  return new Promise((resolve) => {
    let done = false;
    openSheet({
      title: 'PDF com senha',
      body: `${wrong ? '<div class="notice warn mb-3"><i class="fas fa-lock"></i><span>Senha incorreta. Tente de novo.</span></div>' : ''}
        <p class="small muted mb-3">Digite a senha do arquivo. Ela é usada só para abrir o PDF aqui no aparelho e não fica guardada.</p>
        <label class="field"><span>Senha do PDF</span><input class="input" id="pw" type="password" autocomplete="off" autofocus></label>`,
      foot: '<button type="button" class="btn primary block" data-ok>Abrir</button>',
      onMount(el, api) {
        const go = () => { done = true; resolve(el.querySelector('#pw').value); api.close(); };
        el.querySelector('[data-ok]').addEventListener('click', go);
        el.querySelector('#pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      },
      onClose() { if (!done) resolve(null); },
    });
  });
}

async function loadFile(file, rerender) {
  session = { busy: true, fileName: file.name };
  rerender();
  let input = null, password;
  for (let tries = 0; tries < 4 && !input; tries++) {
    try { input = await readFile(file, password); } catch (err) {
      if (err instanceof PasswordNeeded) {
        password = await askPassword(err.wrong);
        if (password === null) { session = null; rerender(); return; }
      } else { session = { error: err.message || 'Não consegui ler o arquivo.' }; rerender(); return; }
    }
  }
  if (!input) { session = { error: 'Não consegui abrir o PDF com essa senha.' }; rerender(); return; }
  const parser = pickParser(input);
  if (!parser) { session = { error: 'Ainda não reconheço este arquivo. Veja abaixo os formatos que o ChaMony já lê.' }; rerender(); return; }
  try {
    const parsed = await parser.parse(input);
    if (!parsed.lines.length) { session = { error: 'Não encontrei lançamentos neste arquivo.' }; rerender(); return; }
    const d = store.get();
    const hint = parsed.meta.cardHint;
    const cardChoice = parser.kind === 'cartao'
      ? (d.cards.find((c) => c.last4 && c.last4 === parsed.meta.last4)?.id || (hint && d.cards.find((c) => !c.last4 && c.name.toLowerCase().includes(hint))?.id) || 'new')
      : 'pix';
    session = { parser, parsed, cardChoice, fileName: file.name, own: [] };
    rebuild();
  } catch (err) {
    console.error(err);
    session = { error: err.message || 'Não consegui entender este arquivo.' };
  }
  rerender();
}

function rebuild() {
  const prev = session.review?.items;
  session.review = buildReview(store.get(), session.parsed, session.parser, { cardId: session.cardChoice });
  // Mantém escolhas já feitas na revisão ao trocar o cartão.
  if (prev) session.review.items.forEach((it, i) => { const p = prev[i]; if (p && p.touched) Object.assign(it, { include: p.include, catId: p.catId, why: p.why, touched: true }); });
}

function pickCategory(it, rerender) {
  const d = store.get();
  openSheet({
    title: 'Categoria',
    body: `<p class="small muted mb-3">${esc(it.desc)}</p>
      <div class="pills wrap">${d.categories.map((c) => `<button type="button" class="pill" data-cat="${esc(c.id)}" style="--c:${safeColor(c.color)}" aria-pressed="${c.id === it.catId}"><i class="fas ${safeIcon(c.icon)}"></i>${esc(c.name)}</button>`).join('')}</div>
      <p class="tiny subtle mt-3">Compras com o mesmo nome neste arquivo recebem a mesma categoria. Nas próximas importações o ChaMony já sugere sozinho.</p>`,
    onMount(el, api) {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        const key = descKey(it.original);
        session.review.items.forEach((x) => {
          if (x === it || (x.kind === 'expense' && descKey(x.original) === key && x.why !== 'você')) { x.catId = b.dataset.cat; x.why = 'você'; x.touched = true; }
        });
        api.close(); rerender();
      });
    },
  });
}

const newCardName = (meta) => (meta.last4 ? `${meta.bank} final ${meta.last4}` : meta.bank);
/** Dia do fechamento: o impresso, ou (Nubank) ~7 dias antes do vencimento. */
function closingDayOf(meta) {
  if (meta.closing) return Number(meta.closing.slice(8, 10));
  if (!meta.due) return null;
  const d = new Date(`${meta.due}T12:00:00`); d.setDate(d.getDate() - 7); return d.getDate();
}

function reviewHTML(d) {
  const { parser, parsed, review } = session;
  const meta = parsed.meta;
  const items = review.items;
  const chosen = items.filter((x) => x.include);
  const outTotal = chosen.filter((x) => x.kind === 'expense').reduce((s, x) => s + x.amount, 0);
  const inTotal = chosen.filter((x) => x.kind === 'income').reduce((s, x) => s + x.amount, 0);
  const catOf = (id) => d.categories.find((c) => c.id === id) || (id === OTHER_CAT.id ? OTHER_CAT : { name: 'Sem categoria', color: '#D9D9E3', icon: 'fa-tag' });
  const isCard = parser.kind === 'cartao';

  const row = (it, i) => {
    const c = catOf(it.catId);
    const future = it.inst && it.inst.total > it.inst.index ? ` (+${it.inst.total - it.inst.index} próximas)` : '';
    const badge = it.status === 'dup' ? '<span class="badge">já importado</span>' : it.status === 'maybe' ? '<span class="badge warn">possível duplicado</span>'
      : !it.include && it.reason ? `<span class="badge">${esc(it.reason)}</span>` : it.kind === 'income' ? '<span class="badge ok">entrada</span>' : '';
    return `<div class="list-row imp-row ${it.include ? 'is-selected' : 'is-off'}" data-i="${i}">
      <button type="button" class="select-dot" data-act="imp-toggle" data-i="${i}" aria-label="${it.include ? 'Não importar' : 'Importar'}" aria-pressed="${it.include}"><i class="fas fa-check"></i></button>
      ${it.kind === 'income' ? chip('#BFE3D0', 'fa-arrow-trend-up') : `<button type="button" class="imp-cat" data-act="imp-cat" data-i="${i}" aria-label="Categoria: ${esc(c.name)}">${chip(c.color, c.icon)}</button>`}
      <div class="list-row__main" data-act="imp-toggle" data-i="${i}" role="button" tabindex="0">
        <div class="list-row__title">${esc(it.desc)}</div>
        <div class="list-row__meta">${esc(shortDate(it.date))}${it.inst ? ` · parcela ${it.inst.index}/${it.inst.total}${future}` : ''}${it.kind === 'expense' ? ` · ${esc(c.name)}${it.why && it.why !== 'você' ? ` <span class="subtle">(${esc(it.why)})</span>` : ''}` : ''}</div>
        ${badge || it.counterpart ? `<div class="mt-2 row" style="gap:6px;flex-wrap:wrap">${badge}${it.counterpart ? `<button type="button" class="link-btn" data-act="imp-own" data-i="${i}" style="min-height:28px;padding:2px 0">É conta minha</button>` : ''}</div>` : ''}
      </div>
      <div class="list-row__value ${it.kind === 'income' ? 'pos' : ''}">${it.kind === 'income' ? '+' : ''}${m(it.amount)}</div>
    </div>`;
  };

  const head = isCard
    ? `Fatura ${esc(meta.bank)}${meta.last4 ? ` · cartão final ${esc(meta.last4)}` : ''}${meta.due ? ` · vence ${esc(shortDate(meta.due))}` : ''}`
    : `Extrato ${esc(meta.bank)} · conta${meta.from ? ` · ${esc(shortDate(meta.from))} a ${esc(shortDate(meta.to))}` : ''}`;
  const check = isCard && meta.checked !== null
    ? (meta.checked
      ? `<div class="notice ok mt-3"><i class="fas fa-circle-check"></i><span>Conferido: a soma dos lançamentos bate com o total da fatura (${m(meta.total)}).</span></div>`
      : `<div class="notice warn mt-3"><i class="fas fa-triangle-exclamation"></i><span>A soma lida (${m(meta.sum)}) não bate com o total da fatura (${m(meta.total)}). Confira se falta alguma linha.</span></div>`)
    : '';
  const cardPick = isCard ? `
    <span class="label mt-3">Em qual cartão do ChaMony?</span>
    <div class="pills wrap">${d.cards.map((c) => `<button type="button" class="pill" data-act="imp-card" data-id="${esc(c.id)}" style="--c:${safeColor(c.color)}" aria-pressed="${session.cardChoice === c.id}"><i class="fas fa-credit-card"></i>${esc(c.name)}${c.last4 ? ` · ${esc(c.last4)}` : ''}</button>`).join('')}
      <button type="button" class="pill" data-act="imp-card" data-id="new" aria-pressed="${session.cardChoice === 'new'}"><i class="fas fa-plus"></i>Novo: ${esc(newCardName(meta))}</button></div>
    ${session.cardChoice === 'new' ? `<p class="tiny subtle mt-2">Será criado com fechamento dia ${closingDayOf(meta) || '—'} e vencimento dia ${Number(meta.due?.slice(8, 10)) || '—'}${meta.limit ? `, limite ${esc(fmt(meta.limit))}` : ''}.</p>` : ''}
    <div class="row mt-3" style="gap:6px">
      <span class="small grow">Entram na fatura de <b>${esc(formatYM(meta.billYM).toLowerCase())}</b>${meta.open ? '' : ', como no PDF'}; as próximas parcelas, nos meses seguintes.</span>
      ${meta.open ? '<button type="button" class="icon-btn sm filled" data-act="imp-month" data-d="-1" aria-label="Mês anterior"><i class="fas fa-chevron-left"></i></button><button type="button" class="icon-btn sm filled" data-act="imp-month" data-d="1" aria-label="Próximo mês"><i class="fas fa-chevron-right"></i></button>' : ''}
    </div>
    ${meta.open ? '<p class="tiny subtle mt-2">Fatura em aberto: o arquivo não traz o total para conferir. Importar de novo depois (com compras novas) não duplica as que já entraram.</p>' : ''}` : '';

  const groups = [['Para importar', items.map((it, i) => [it, i]).filter(([it]) => it.include)], ['Fora da importação', items.map((it, i) => [it, i]).filter(([it]) => !it.include)]];
  return `
    <section class="card">
      <div class="row">${chip('#FFD9B8', isCard ? 'fa-credit-card' : 'fa-building-columns', 'lg')}
        <div class="grow"><div class="card-title">${head}</div><div class="tiny muted truncate">${esc(session.fileName || '')} · lido aqui no aparelho</div></div>
        <button type="button" class="icon-btn sm" data-act="imp-cancel" aria-label="Cancelar importação"><i class="fas fa-xmark"></i></button></div>
      ${check}${cardPick}
    </section>
    <div class="row mt-3 mb-2" style="justify-content:space-between">
      <p class="small muted">${plural(chosen.length, 'lançamento marcado', 'lançamentos marcados')} de ${items.length}</p>
      <div class="row" style="gap:0"><button type="button" class="link-btn" data-act="imp-all">Marcar todos</button><button type="button" class="link-btn" data-act="imp-none">Nenhum</button></div>
    </div>
    <p class="tiny subtle mb-3">Toque no ícone para trocar a categoria; toque na linha para marcar ou desmarcar.</p>
    ${groups.filter(([, list]) => list.length).map(([title, list]) => `
      <div class="section-head"><h2>${title} (${list.length})</h2></div>
      <div class="list">${list.map(([it, i]) => row(it, i)).join('')}</div>`).join('')}
    <div class="imp-spacer"></div>
    <div class="bulkbar imp-bar">
      <div class="grow small"><b class="strong">${plural(chosen.length, 'item', 'itens')}</b><div class="tiny muted">${outTotal ? `gastos ${m(outTotal)}` : ''}${outTotal && inTotal ? ' · ' : ''}${inTotal ? `entradas ${m(inTotal)}` : ''}</div></div>
      <button type="button" class="btn sm primary" data-act="imp-apply" ${chosen.length ? '' : 'disabled'}><i class="fas fa-check"></i>Importar</button>
    </div>`;
}

export default {
  id: 'importar',
  title: 'Importar extrato',
  render({ d }) {
    if (session?.busy) return `<div class="card">${emptyState('tea', 'Lendo o arquivo…', 'Tudo acontece aqui no aparelho. Leva só alguns segundos.')}</div>`;
    if (session?.review) return reviewHTML(d);
    return `
      ${session?.error ? `<div class="notice warn mb-3"><i class="fas fa-triangle-exclamation"></i><span>${esc(session.error)}</span></div>` : ''}
      <section class="card">
        <div class="row mb-3">${chip('#FFD9B8', 'fa-file-import', 'lg')}<div class="grow"><div class="card-title">Traga o extrato do banco</div>
          <p class="small muted">Escolha o PDF ou CSV que o banco gera. O ChaMony lê aqui no aparelho, sugere categorias, avisa duplicados e mostra tudo para você revisar antes de salvar.</p></div></div>
        <button type="button" class="btn primary block" data-act="imp-pick"><i class="fas fa-file-arrow-up"></i>Escolher arquivo</button>
        <input type="file" id="imp-file" accept=".pdf,.csv,application/pdf,text/csv" hidden>
        <p class="tiny subtle mt-3"><i class="fas fa-lock"></i> O arquivo não é enviado para lugar nenhum nem fica guardado: só os lançamentos que você confirmar.</p>
      </section>
      <div class="section-head"><h2>Formatos</h2></div>
      <div class="list">${SUPPORTED.map(([bank, what, ok]) => `<div class="list-row">${chip(ok ? '#CDEBC5' : '#D9D9E3', ok ? 'fa-check' : 'fa-clock')}
        <div class="list-row__main"><div class="list-row__title">${esc(bank)}</div><div class="list-row__meta">${esc(what)}</div></div>
        <span class="badge ${ok ? 'ok' : ''}">${ok ? 'pronto' : 'em breve'}</span></div>`).join('')}</div>
      <p class="tiny subtle mt-3">Também dá para colar linhas soltas em <a href="#/compras">Compras → Colar</a>.</p>`;
  },
  mount(root, { rerender }) {
    root.querySelector('#imp-file')?.addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) loadFile(f, rerender); });
  },
  actions: {
    'imp-pick': (_, { root }) => root.querySelector('#imp-file').click(),
    'imp-cancel': (_, { rerender }) => { session = null; rerender(); },
    'imp-toggle': (el, { rerender }) => { const it = session.review.items[Number(el.dataset.i)]; it.include = !it.include; it.touched = true; feedback('tap'); rerender(); },
    'imp-cat': (el, { rerender }) => pickCategory(session.review.items[Number(el.dataset.i)], rerender),
    'imp-all': (_, { rerender }) => { session.review.items.forEach((x) => { x.include = true; x.touched = true; }); rerender(); },
    'imp-none': (_, { rerender }) => { session.review.items.forEach((x) => { x.include = false; x.touched = true; }); rerender(); },
    'imp-card': (el, { rerender }) => { session.cardChoice = el.dataset.id; rebuild(); rerender(); },
    'imp-month': (el, { rerender }) => { session.parsed.meta.billYM = shiftYM(session.parsed.meta.billYM, Number(el.dataset.d)); rerender(); },
    // "É conta minha": essa pessoa é você → transferências entre suas contas (lembrado nas próximas importações).
    'imp-own': (el, { rerender }) => {
      const it = session.review.items[Number(el.dataset.i)];
      const key = nameKey(it.counterpart);
      session.own.push(it.counterpart);
      session.review.items.forEach((x) => {
        if (x.counterpart && sameName(nameKey(x.counterpart), key)) { x.include = false; x.reason = 'Transferência entre suas contas'; x.counterpart = ''; x.touched = true; }
      });
      toast('Anotado: transferências com esse nome ficam de fora');
      rerender();
    },
    'imp-apply': (_, { ui, go }) => {
      const { parser, parsed, review } = session;
      const meta = parsed.meta;
      let cardId = session.cardChoice;
      let base = structuredClone(store.get());
      if (parser.kind === 'cartao') {
        if (cardId === 'new') {
          cardId = uid('card');
          base.cards.push({ id: cardId, name: newCardName(meta), closingDay: closingDayOf(meta) || 20,
            dueDay: Number(meta.due?.slice(8, 10)) || 5, color: ACCENT_COLORS[base.cards.length % ACCENT_COLORS.length], active: true, limit: meta.limit || 0, ...(meta.last4 ? { last4: meta.last4 } : {}) });
        } else if (meta.last4) {
          const c = base.cards.find((x) => x.id === cardId); if (c && !c.last4) c.last4 = meta.last4;
        }
      }
      const { data, stats } = applyImport(base, review.items, { ...review.ctx, cardId }, session.own);
      store.replaceAll(data);
      session = null;
      feedback('success');
      toast(`Importado: ${plural(stats.exp, 'gasto', 'gastos')}${stats.inc ? ` e ${plural(stats.inc, 'entrada', 'entradas')}` : ''} 🌼`, { action: { label: 'Desfazer', fn: () => { store.restorePrevious(); toast('Importação desfeita'); } }, duration: 8000 });
      if (parser.kind === 'cartao' && meta.billYM) ui.ym = meta.billYM;
      go(parser.kind === 'cartao' ? 'cartoes' : 'compras');
    },
  },
};
