// Itaú — leitores de PDF (formatos conferidos com exemplos reais de 11/2026):
//  • Extrato de conta corrente ("Extrato conta corrente"): colunas Data · Lançamentos · Descrição · Valor (R$) · Saldo (R$);
//    descrições longas quebram em várias linhas; linhas só com data + saldo são o saldo do dia (ignoradas);
//    seção "Lançamentos futuros" antes de "Lançamentos"; fim em "Posição consolidada".
//  • Fatura do cartão ("Lançamentos: compras e saques"): 2 colunas por página; cada compra = linha "DD/MM ESTAB [NN/TT] valor"
//    + linha "categoria cidade"; seções "Pagamentos efetuados" (ignorada), "Lançamentos internacionais" (+ "Repasse de IOF"),
//    "Compras parceladas - próximas faturas" (valores das próximas parcelas); total em "Total dos lançamentos atuais".
// CSV do Itaú: aguardando exemplo.

import { toRows, joinItems } from '../pdf.js';

const MONEY = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;
const DMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DM = /^(\d{2})\/(\d{2})$/;
const money = (s) => { const n = Number(String(s).replace(/\./g, '').replace(',', '.')); return Math.round(n * 100); };
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const pageText = (page) => toRows(page.items).map((r) => joinItems(r.items)).join('\n');

// ---------------------------------------------------------------------------
// Extrato da conta corrente
// ---------------------------------------------------------------------------
function parseConta(pdf) {
  const firstText = pageText(pdf.pages[0]);
  const lines = firstText.split('\n');
  const cpfIdx = lines.findIndex((l) => /CPF:/i.test(l));
  const holder = cpfIdx > 0 ? lines[cpfIdx - 1].trim() : '';
  const period = /Per[ií]odo de visualiza[cç][aã]o:\s*(\d{2}\/\d{2}\/\d{4})\s*at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i.exec(firstText);
  const toIso = (s) => { const m = DMY.exec(s); return m ? iso(m[3], m[2], m[1]) : null; };

  const out = [];
  let cols = null, section = null, cur = null, stop = false;
  const flush = () => { if (cur && cur.amount !== null && (cur.kind || cur.desc)) out.push(cur); cur = null; };

  for (const page of pdf.pages) {
    if (stop) break;
    for (const row of toRows(page.items)) {
      const text = joinItems(row.items);
      if (/^Posi[cç][aã]o consolidada/i.test(text)) { flush(); stop = true; break; }
      if (/^Lan[cç]amentos futuros$/i.test(text)) { flush(); section = 'future'; continue; }
      if (/^Lan[cç]amentos$/i.test(text)) { flush(); section = 'done'; continue; }
      if (/^Data\b/.test(text) && /Valor/.test(text) && /Saldo/.test(text)) {
        const x = (re) => row.items.find((i) => re.test(i.s))?.x;
        cols = { kind: x(/^Lan/), desc: x(/^Descri/), value: x(/^Valor/), saldo: x(/^Saldo/) };
        continue;
      }
      if (!cols || !section) continue;
      // Robustez: "DD/MM/AAAA TIPO" às vezes vem num pedaço só.
      row.items = row.items.flatMap((i) => {
        const m = /^(\d{2}\/\d{2}\/\d{4})\s+(.+)$/.exec(i.s);
        return m && i.x < cols.kind - 5 ? [{ ...i, s: m[1], w: 1 }, { ...i, s: m[2], x: cols.kind }] : [i];
      });
      const cell = { date: [], kind: [], desc: [], value: [], saldo: [] };
      for (const it of row.items) {
        const k = it.x < cols.kind - 5 ? 'date' : it.x < cols.desc - 5 ? 'kind' : it.x < cols.value - 30 ? 'desc' : it.x < cols.saldo - 10 ? 'value' : 'saldo';
        cell[k].push(it);
      }
      const date = toIso(joinItems(cell.date));
      const kind = joinItems(cell.kind), desc = joinItems(cell.desc), value = joinItems(cell.value);
      if (date) {
        flush();
        if (!kind && !desc) continue; // saldo do dia
        cur = { date, kind, desc, amount: MONEY.test(value) ? money(value) : null, future: section === 'future', raw: text };
      } else if (cur) {
        if (kind) cur.kind = `${cur.kind} ${kind}`.trim();
        if (desc) cur.desc = `${cur.desc} ${desc}`.trim();
        if (cur.amount === null && MONEY.test(value)) cur.amount = money(value);
        cur.raw += ` ${text}`;
      }
    }
  }
  flush();

  const holderKey = fold(holder).split(/\s+/).filter((w) => w.length > 2);
  const isHolder = (s) => {
    const f = fold(s);
    return holderKey.length >= 2 && f.includes(holderKey[0]) && f.includes(holderKey[holderKey.length - 1]);
  };
  return {
    meta: { bank: 'Itaú', kind: 'conta', from: period ? toIso(period[1]) : null, to: period ? toIso(period[2]) : null },
    lines: out.map((l) => {
      // Valor no extrato: negativo = saída. No ChaMony: amount > 0 = gasto; < 0 = entrada.
      const outflow = l.amount < 0;
      const k = fold(l.kind);
      let type = outflow ? 'expense' : 'income';
      let reason = '';
      if (outflow && /debito automatico/.test(k) && /fatura/i.test(l.desc)) { type = 'card-payment'; reason = 'Pagamento de fatura do cartão'; }
      else if (outflow && /(pix|ted|doc|transf)/.test(k) && isHolder(l.desc)) { type = 'transfer'; reason = 'Transferência entre suas contas'; }
      else if (!outflow && /rendimento/.test(k)) { type = 'income'; reason = 'Rendimento'; }
      else if (!outflow) { type = 'income-other'; reason = 'Entrada (TED/PIX recebido)'; }
      return { date: l.date, desc: l.desc || l.kind, kind: l.kind, amount: -l.amount, type, reason, future: l.future, raw: l.raw };
    }),
  };
}

// ---------------------------------------------------------------------------
// Fatura do cartão de crédito
// ---------------------------------------------------------------------------
function parseCartao(pdf) {
  const head = pdf.pages.slice(0, 2).map(pageText).join('\n');
  const grab = (re) => re.exec(head)?.[1] || null;
  const toIso = (s) => { const m = DMY.exec(s || ''); return m ? iso(m[3], m[2], m[1]) : null; };
  const closing = toIso(grab(/Emiss[aã]o:\s*(\d{2}\/\d{2}\/\d{4})/i)) || toIso(grab(/Postagem:\s*(\d{2}\/\d{2}\/\d{4})/i));
  const due = toIso(grab(/Vencimento:\s*(\d{2}\/\d{2}\/\d{4})/i));
  const nextClosing = toIso(grab(/Fechamento:\s*(\d{2}\/\d{2}\/\d{4})/i));
  const cardNo = grab(/Cart[aã]o\s+(\d{4}[\dX.\s]{6,}\d{4})/i);
  const last4 = cardNo ? cardNo.replace(/\D/g, '').slice(-4) : null;
  const allText = pdf.pages.map(pageText).join('\n');
  const limitTxt = /Limite total de cr[eé]dito\s+([\d.]+,\d{2})/i.exec(allText)?.[1];
  const totalTxt = /Total dos lan[cç]amentos atuais\s*([\d.]+,\d{2})/i.exec(allText)?.[1];
  const [cy, cm] = (closing || '2000-01').split('-').map(Number);
  const yearFor = (m) => (m > cm ? cy - 1 : cy);

  // Colunas: em cada página, cabeçalhos "DATA" em x diferentes marcam a coluna da direita.
  const columns = [];
  for (const page of pdf.pages) {
    const dataX = [...new Set(page.items.filter((i) => i.s === 'DATA').map((i) => Math.round(i.x / 20) * 20))].sort((a, b) => a - b);
    const split = dataX.length > 1 ? dataX[dataX.length - 1] - 10 : Infinity;
    columns.push(page.items.filter((i) => i.x < split), page.items.filter((i) => i.x >= split));
  }

  const purchases = [], upcoming = [], payments = [];
  let mode = null, cur = null, iof = 0;
  for (const items of columns) {
    for (const row of toRows(items)) {
      // Pontinhos soltos da diagramação não contam; "DD/MM Loja" às vezes vem num pedaço só.
      row.items = row.items.filter((i) => !/^[.\-–•·]$/.test(i.s)).flatMap((i) => {
        const m = /^(\d{2}\/\d{2})\s+(.+)$/.exec(i.s);
        return m ? [{ ...i, s: m[1], w: 1 }, { ...i, s: m[2], x: i.x + 30 }] : [i];
      });
      const text = joinItems(row.items);
      const f = fold(text);
      if (/^pagamentos efetuados/.test(f)) { mode = 'payments'; cur = null; continue; }
      if (/^lancamentos: compras e saques/.test(f)) { mode = 'buy'; cur = null; continue; }
      if (/^lancamentos internacionais/.test(f)) { mode = 'intl'; cur = null; continue; }
      if (/^compras parceladas/.test(f)) { mode = 'next'; cur = null; continue; }
      if (/^(limites de credito|encargos cobrados|novo teto|fique atento|simulacao)/.test(f)) { mode = null; cur = null; continue; }
      if (/^repasse de iof/.test(f)) { const v = text.match(/([\d.]+,\d{2})\s*$/); if (v) iof = money(v[1]); continue; }
      if (!mode || /^(data |total|lancamentos no cartao|proxima fatura|demais faturas)/.test(f)) { if (/^total/.test(f)) cur = null; continue; }

      const first = row.items[0]?.s || '';
      const last = row.items[row.items.length - 1]?.s || '';
      if (DM.test(first) && MONEY.test(last) && row.items.length >= 3) {
        const [, d, m] = DM.exec(first);
        const desc = joinItems(row.items.slice(1, -1));
        const inst = /\s(\d{2})\/(\d{2})$/.exec(desc);
        const rec = {
          date: iso(yearFor(Number(m)), m, d),
          desc: inst ? desc.slice(0, inst.index).trim() : desc,
          inst: inst ? { index: Number(inst[1]), total: Number(inst[2]) } : null,
          amount: money(last), bankCat: '', intl: mode === 'intl', raw: text,
        };
        if (mode === 'payments') { payments.push(rec); cur = null; }
        else if (mode === 'next') { upcoming.push(rec); cur = null; }
        else { purchases.push(rec); cur = rec; }
        continue;
      }
      // Linha de baixo da compra: "categoria cidade" (só nas compras nacionais).
      if (cur && mode === 'buy' && !cur.bankCat && !MONEY.test(last) && !/^[A-Z ]+$/.test(text)) {
        cur.bankCat = fold(text.split(' ')[0]);
        cur.raw += ` ${text}`;
        cur = null;
      }
    }
  }
  if (iof) purchases.push({ date: closing, desc: 'IOF de compras internacionais', inst: null, amount: iof, bankCat: 'iof', intl: true, raw: `Repasse de IOF ${iof}` });

  const sum = purchases.reduce((s, p) => s + p.amount, 0);
  const total = totalTxt ? money(totalTxt) : null;
  return {
    meta: {
      bank: 'Itaú', kind: 'cartao', last4, closing, due, nextClosing, limit: limitTxt ? money(limitTxt) : null,
      billYM: closing ? closing.slice(0, 7) : null,
      total, sum, checked: total !== null ? total === sum : null,
    },
    lines: purchases.map((p) => ({ ...p, type: p.amount < 0 ? 'refund' : 'expense', reason: p.amount < 0 ? 'Estorno/crédito' : '' })),
    upcoming,
  };
}

// ---------------------------------------------------------------------------
const textOf = (file) => fold(file.pdfText || file.text || '');

export default [
  {
    id: 'itau-conta', bank: 'Itaú', kind: 'conta', formats: ['pdf'], label: 'Itaú · extrato da conta (PDF)',
    detect: (file) => (file.pdfText && /extrato conta corrente/.test(textOf(file)) && /itau|ag[eê]ncia/.test(textOf(file)) ? 0.9 : 0),
    parse: async (file) => parseConta(file.pdf),
  },
  {
    id: 'itau-cartao', bank: 'Itaú', kind: 'cartao', formats: ['pdf'], label: 'Itaú · fatura do cartão (PDF)',
    detect: (file) => (file.pdfText && /lancamentos: compras e saques/.test(textOf(file)) && /total desta fatura|resumo da fatura/.test(textOf(file)) ? 0.9 : 0),
    parse: async (file) => parseCartao(file.pdf),
  },
];

export { parseConta, parseCartao };
