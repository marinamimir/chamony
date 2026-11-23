// Nubank — leitores (formato conferido com exemplo real de 11/2026):
//  • Conta (CSV): cabeçalho "Data,Valor,Identificador,Descrição"; data DD/MM/AAAA; valor com sinal e ponto decimal
//    (negativo = saída); Identificador único por lançamento (usado contra duplicados);
//    descrição "Tipo - Nome - documento mascarado - banco/agência/conta".
//  • Fatura do cartão (CSV "Nubank_AAAA-MM-DD.csv", data = vencimento): cabeçalho "date,title,amount"; data AAAA-MM-DD;
//    valor em formato brasileiro entre aspas ("96,99", "- 2.456,77"); parcelas "Título - Parcela N/T" com a data em que a
//    PARCELA caiu (não a da compra); "Pagamento recebido" (negativo) = pagamento da fatura. Sem total nem final do cartão.

import { parseCSV } from '../csv.js';

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const title = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s);

function parseConta(file) {
  const rows = parseCSV(file.text);
  const head = rows.shift().map((h) => fold(h.trim()));
  const col = (name) => head.indexOf(name);
  const iD = col('data'), iV = col('valor'), iId = col('identificador'), iDesc = col('descricao');
  const lines = rows.map((r) => {
    const m = DMY.exec((r[iD] || '').trim());
    const v = Number(String(r[iV] || '').trim());
    if (!m || !Number.isFinite(v)) return null;
    const full = (r[iDesc] || '').trim();
    // "Transferência enviada pelo Pix - NOME - •••.000.000-•• - BANCO ..." → tipo + contraparte (sem documento/conta)
    const parts = full.split(' - ').map((x) => x.trim());
    const kind = parts[0] || full;
    const counterpart = parts.length > 1 && !/^[•\d]/.test(parts[1]) ? parts[1] : '';
    const k = fold(kind);
    const amount = -Math.round(v * 100); // ChaMony: > 0 = gasto, < 0 = entrada
    let type = amount > 0 ? 'expense' : 'income-other', reason = amount > 0 ? '' : 'Entrada (TED/PIX recebido)';
    let desc = counterpart ? title(counterpart) : kind;
    if (/pix|transfer/.test(k)) desc = `${amount > 0 ? 'Pix para' : 'Pix de'} ${title(counterpart || kind)}`;
    if (/pagamento de fatura/.test(k)) { type = 'card-payment'; reason = 'Pagamento de fatura do cartão'; }
    else if (/aplica[cç]|resgate|rdb|caixinha|guardad/.test(k)) { type = 'transfer'; reason = 'Movimentação de caixinha/investimento'; }
    else if (/rendimento/.test(k) && amount < 0) { type = 'income'; reason = 'Rendimento'; }
    return {
      date: `${m[3]}-${m[2]}-${m[1]}`, desc, kind, counterpart, amount, type, reason,
      key: r[iId] ? `nubank-conta:${r[iId].trim()}` : null,
      raw: kind + (counterpart ? ` - ${counterpart}` : ''), // sem CPF/conta de terceiros
    };
  }).filter(Boolean);
  const dates = lines.map((l) => l.date).sort();
  return { meta: { bank: 'Nubank', kind: 'conta', from: dates[0] || null, to: dates.at(-1) || null }, lines };
}

const brMoney = (s) => {
  const t = String(s).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
const ymShift = (ym, k) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function parseCartao(file) {
  const rows = parseCSV(file.text);
  rows.shift();
  const dueMatch = /(\d{4})-(\d{2})-(\d{2})/.exec(file.name || '');
  const due = dueMatch ? dueMatch[0] : null;
  const lines = [];
  for (const r of rows) {
    const [date, rawTitle, rawAmount] = [r[0]?.trim(), (r[1] || '').trim(), r[2]];
    const amount = brMoney(rawAmount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || amount === null) continue;
    const inst = /\s+-\s+Parcela\s+(\d+)\/(\d+)\s*$/i.exec(rawTitle);
    const title = inst ? rawTitle.slice(0, inst.index).trim() : rawTitle;
    const k = fold(title);
    let type = amount < 0 ? 'refund' : 'expense', reason = amount < 0 ? 'Estorno/crédito' : '';
    if (/^pagamento recebido|^pagamento (da|de) fatura/.test(k)) { type = 'card-payment'; reason = 'Pagamento da fatura'; }
    const line = { date, desc: title, inst: inst ? { index: Number(inst[1]), total: Number(inst[2]) } : null, amount, type, reason, bankCat: '', raw: rawTitle };
    if (line.inst) {
      // A data é a da parcela: estima a compra voltando (N-1) meses; a chave usa só o mês, estável de uma fatura para a outra.
      const estYM = ymShift(date.slice(0, 7), -(line.inst.index - 1));
      line.date = `${estYM}-${date.slice(8, 10)}`;
      line.key = `nubank-cartao:${estYM}:${k.replace(/[^a-z0-9]/g, '')}:p${line.inst.total}`;
    }
    lines.push(line);
  }
  // Mês da fatura: o fechamento do Nubank costuma ser ~7 dias antes do vencimento (dá para trocar na revisão).
  let billYM = null;
  if (due) { const d = new Date(`${due}T12:00:00`); d.setDate(d.getDate() - 7); billYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  else billYM = lines.filter((l) => !l.inst && l.type === 'expense').map((l) => l.date.slice(0, 7)).sort().at(-1) || null;
  const sum = lines.filter((l) => l.type !== 'card-payment').reduce((s2, l) => s2 + l.amount, 0);
  return { meta: { bank: 'Nubank', kind: 'cartao', due, billYM, total: null, sum, checked: null, open: true, last4: null, cardHint: 'nubank' }, lines };
}

const header = (file) => fold((file.text || '').replace(/^﻿/, '').split(/\r?\n/, 1)[0] || '').replace(/\s/g, '');

export default [
  {
    id: 'nubank-conta', bank: 'Nubank', kind: 'conta', formats: ['csv'], label: 'Nubank · extrato da conta (CSV)',
    detect: (file) => (file.text && header(file) === 'data,valor,identificador,descricao' ? 0.95 : 0),
    parse: async (file) => parseConta(file),
  },
  {
    id: 'nubank-cartao', bank: 'Nubank', kind: 'cartao', formats: ['csv'], label: 'Nubank · fatura do cartão (CSV)',
    detect: (file) => (file.text && header(file) === 'date,title,amount' ? 0.9 : 0),
    parse: async (file) => parseCartao(file),
  },
];

export { parseConta, parseCartao };
