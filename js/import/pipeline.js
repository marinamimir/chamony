// Fluxo comum de importação de extratos: ler → escolher leitor → sugerir categoria → detectar duplicados e
// parcelas → (tela de revisão) → aplicar. Tudo local.

import { readPdf } from './pdf.js';
import { PARSERS } from './parser.js';
import { uid, fold } from '../core/dom.js';
import { shiftYM, daysBetween } from '../core/dates.js';
import { catSnapshot } from '../core/finance.js';

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------
export async function readFile(file, password) {
  const buf = await file.arrayBuffer();
  const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name) || new TextDecoder().decode(buf.slice(0, 5)) === '%PDF-';
  if (isPdf) {
    const pdf = await readPdf(buf, password);
    return { name: file.name, type: 'pdf', pdf, pdfText: pdf.text };
  }
  return { name: file.name, type: 'csv', text: new TextDecoder('utf-8').decode(buf) };
}

export function pickParser(input) {
  return PARSERS.map((p) => ({ p, s: p.detect(input) || 0 })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0]?.p || null;
}

// ---------------------------------------------------------------------------
// Categoria: aprende com o histórico; depois palavras-chave; depois a categoria do banco.
// ---------------------------------------------------------------------------
const STOP = new Set(['sao', 'paulo', 'porto', 'alegre', 'ltda', 'brbr', 'compra', 'debito', 'pagamento', 'de', 'do', 'da', 'com', 'pix', 'enviado', 'sa', 'br', 'loja', 'shop', 'comercio']);
export const descKey = (s) => fold(s).replace(/\b\d{2}\/\d{2}\b/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => descKey(s).split(' ').filter((t) => t.length >= 4 && !STOP.has(t));

const KEYWORDS = [
  [/uber|99pop|99 ?app|taxi|cabify|metro|onibus|bilhete|estacion|posto|ipiranga|shell|combust/, ['transporte']],
  [/ifood|99food|rappi|restaur|lanch|pizz|burger|poke|sushi|padaria|cafe|bar |cervej|sorvet|acai|food/, ['alimenta', 'comida', 'restaur']],
  [/zaffari|carrefour|assai|atacad|supermerc|mercado|hortifrut|sacolao|emporio/, ['mercado', 'supermerc']],
  [/farma|drogar|raia|pague menos|panvel|clinic|medic|laborat|hospital|odonto|qualidoc|saude/, ['saude', 'farmac']],
  [/pet ?love|petz|cobasi|veterin|pet\b/, ['pet']],
  [/shopee|amazon|aliexpress|mercadolivre|mercado livre|magalu|shein|riachuel|renner|cea\b|zara|beleza na web|tiktok shop/, ['compras', 'roupa', 'vestu']],
  [/netflix|spotify|disney|hbo|prime video|youtube|google|apple|discord|steam|playstation|xbox|cinema|ingresso/, ['lazer', 'assinat', 'servic']],
  [/eletropaulo|enel|cemig|copel|cesp|energia|sabesp|agua|gas|vivo|claro|tim\b|oi\b|internet|condom|aluguel|imov|quintoandar|tarifa/, ['contas fixas', 'casa', 'moradia', 'contas']],
];
const BANK_CATS = {
  restaurante: ['alimenta', 'comida', 'restaur'], supermercado: ['mercado', 'supermerc'], transporte: ['transporte'], saude: ['saude'],
  vestuario: ['compras', 'roupa', 'vestu'], lazer: ['lazer'], eletronicos: ['compras', 'eletron'], educacao: ['educa', 'estudo'],
  servicos: ['servic', 'compras'], hospedagem: ['viage', 'lazer'], turismo: ['viage', 'lazer'], iof: ['taxa', 'contas fixas', 'compras'],
  tarifa: ['taxa', 'tarifa', 'contas fixas'], boleto: ['contas fixas', 'casa', 'moradia'],
};
export const OTHER_CAT = { id: 'c-outros', name: 'Outros', color: '#D9D9E3', icon: 'fa-tag' };

/** Monta um "sugeridor" a partir das compras já categorizadas. */
export function makeSuggester(d) {
  const exact = new Map(), tok = new Map();
  for (const e of d.expenses) {
    if (!e.catId || !d.categories.some((c) => c.id === e.catId)) continue;
    const k = descKey(e.desc);
    exact.set(k, e.catId);
    for (const t of tokens(e.desc)) {
      const m = tok.get(t) || new Map();
      m.set(e.catId, (m.get(e.catId) || 0) + 1);
      tok.set(t, m);
    }
  }
  const byName = (hints) => {
    for (const h of hints) { const c = d.categories.find((x) => fold(x.name).includes(h)); if (c) return c.id; }
    return null;
  };
  // Sem pista nenhuma: "Outros" (criada na hora de importar, se ainda não existir).
  const fallback = d.categories.find((c) => /outro/.test(fold(c.name)))?.id || OTHER_CAT.id;
  return (desc, bankCat = '') => {
    const k = descKey(desc);
    if (exact.has(k)) return { catId: exact.get(k), why: 'aprendido' };
    const score = new Map();
    for (const t of tokens(desc)) for (const [cat, n] of tok.get(t) || []) score.set(cat, (score.get(cat) || 0) + n);
    const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) return { catId: best[0], why: 'aprendido' };
    const f = ` ${fold(desc)} `;
    for (const [re, hints] of KEYWORDS) if (re.test(f)) { const id = byName(hints); if (id) return { catId: id, why: 'palavra-chave' }; }
    if (bankCat && BANK_CATS[bankCat]) { const id = byName(BANK_CATS[bankCat]); if (id) return { catId: id, why: 'categoria do banco' }; }
    if (best) return { catId: best[0], why: 'aprendido' };
    return { catId: fallback, why: '' };
  };
}

/** "MP*ALIEXPRESSO" → "Aliexpresso", "DL *UberRidesS" → "UberRidesS". Mantém o original no histórico de busca. */
export function prettyDesc(s) {
  let t = String(s).replace(/^(DL|MP|PG|PAG|EC|S2P|SHOPEE|IFD|UBER|HTM)\s*\*\s*/i, (m, p) => (/shopee/i.test(p) ? 'Shopee · ' : /uber/i.test(p) ? 'Uber · ' : ''));
  t = t.replace(/\s{2,}/g, ' ').trim();
  if (t === t.toUpperCase()) t = t.toLowerCase().replace(/(^|[\s·*/-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return t || s;
}

// ---------------------------------------------------------------------------
// Itens da revisão
// ---------------------------------------------------------------------------
/**
 * @returns {{ items: object[], ctx: object }}
 * item: { id, include, kind: 'expense'|'income', date, desc, original, amount, catId, why, inst, nextAmount, imp, status, reason, future }
 */
export function buildReview(d, parsed, parser, { cardId = 'pix' } = {}) {
  const suggest = makeSuggester(d);
  const meta = parsed.meta || {};
  const isCard = parser.kind === 'cartao';
  const src = parser.id;
  const scope = isCard ? `${src}:${meta.last4 || 'x'}` : src;
  const seen = new Map();
  const knownImp = new Set([...d.expenses, ...d.trash, ...d.incomes].map((x) => x.imp).filter(Boolean));
  const upcoming = parsed.upcoming || [];

  const items = parsed.lines.map((l) => {
    const original = l.desc;
    const desc = prettyDesc(l.desc);
    const amount = Math.abs(l.amount);
    const income = l.amount < 0 || l.type?.startsWith('income');
    // Chave estável: mesma compra em outro arquivo → mesma chave (parcelas: sem o valor, que varia centavos).
    let key = `${scope}:${l.date}:${descKey(original).replace(/\s/g, '')}:${l.inst ? `p${l.inst.total}` : amount}`;
    const n = (seen.get(key) || 0) + 1; seen.set(key, n);
    if (n > 1) key += `#${n}`;
    const imp = key;
    const kindCat = /tarifa/i.test(l.kind || '') ? 'tarifa' : /boleto/i.test(l.kind || '') ? 'boleto' : '';
    const sug = income ? { catId: '', why: '' } : suggest(original, l.bankCat || kindCat);
    const next = l.inst ? upcoming.find((u) => u.date === l.date && descKey(u.desc) === descKey(original) && u.inst?.index === l.inst.index + 1) : null;

    const it = {
      id: uid('imp'), kind: income ? 'income' : 'expense', date: l.date, desc, original, amount, catId: sug.catId, why: sug.why,
      inst: l.inst || null, nextAmount: next?.amount ?? null, imp, include: true, status: 'new', reason: l.reason || '', future: !!l.future, bankCat: l.bankCat || '',
    };
    // Padrões combinados: fatura e transferência entre contas ficam de fora; só rendimentos entram como renda.
    if (l.type === 'card-payment' || l.type === 'transfer') it.include = false;
    if (l.type === 'income-other') it.include = false;
    if (l.future) { it.include = false; it.reason = it.reason || 'Agendado (ainda não aconteceu)'; }
    if (knownImp.has(imp)) { it.include = false; it.status = 'dup'; it.reason = 'Já importado antes'; }
    else if (!income) {
      // Parecido com algo registrado à mão (mesmo valor, até 3 dias de diferença, mesma forma de pagamento).
      const per = amount;
      const hit = d.expenses.find((e) => !e.imp && e.amount === per && Math.abs(daysBetween(e.purchaseDate, l.date)) <= 3 && (isCard ? e.cardId === cardId : e.cardId === 'pix'));
      if (hit) { it.include = false; it.status = 'maybe'; it.reason = `Parece “${hit.desc}”, já registrado`; }
    }
    return it;
  });
  return { items, ctx: { parser, meta, isCard, src, cardId } };
}

/** Aplica os itens marcados num clone dos dados. Devolve { data, stats }. */
export function applyImport(d, items, { isCard, src, cardId, meta }) {
  const next = structuredClone(d);
  const now = new Date().toISOString();
  let exp = 0, inc = 0;
  const billBase = isCard ? meta.billYM : null;
  if (items.some((x) => x.include && x.catId === OTHER_CAT.id) && !next.categories.some((c) => c.id === OTHER_CAT.id)) next.categories.push({ ...OTHER_CAT });
  for (const it of items.filter((x) => x.include)) {
    if (it.kind === 'income') {
      next.incomes.push({ id: uid('i'), desc: it.desc, amount: it.amount, date: it.date, usable: true, imp: it.imp });
      inc += 1;
      continue;
    }
    const cat = next.categories.find((c) => c.id === it.catId);
    const gid = uid('g');
    const start = it.inst?.index || 1, total = it.inst?.total || 1;
    for (let k = start; k <= total; k++) {
      next.expenses.push({
        id: `${gid}_${k}`, groupId: gid, desc: it.desc, amount: k === start ? it.amount : (it.nextAmount ?? it.amount),
        purchaseDate: it.date, time: '12:00', cardId: isCard ? cardId : 'pix', catId: it.catId, catSnap: catSnapshot(cat),
        instIndex: k, instTotal: total, recurring: false, note: it.original !== it.desc ? `Extrato: ${it.original}` : '', tags: [],
        ...(billBase ? { billYM: shiftYM(billBase, k - start) } : {}),
        imp: it.imp, source: src, createdAt: now,
      });
    }
    exp += 1;
  }
  next.meta.importedFrom = [...(next.meta.importedFrom || []), { origin: src, at: now }].slice(-20);
  return { data: next, stats: { exp, inc } };
}
