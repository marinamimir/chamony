// Importação de extratos (fase 2) — interface comum dos leitores por banco.
//
// Cada banco exporta um objeto `BankParser`:
//   {
//     id: 'nubank-cartao',                 // único
//     bank: 'Nubank', kind: 'cartao' | 'conta',
//     formats: ['csv', 'pdf'],
//     detect(file: { name, type, text?, pdfText? }) → number   // confiança 0..1
//     parse(input) → Promise<StatementLine[]>
//   }
//
// StatementLine (saída normalizada, sempre em centavos):
//   {
//     date: 'AAAA-MM-DD',        // data da compra/lançamento
//     desc: string,              // descrição original do banco
//     amount: number,            // centavos; positivo = saída (gasto), negativo = entrada/estorno
//     installment?: { index, total },   // "PARCELA 2/10"
//     raw: string,               // linha original, para a tela de revisão
//   }
//
// Depois do parse, um pipeline comum (a escrever na fase 2) faz:
//   sugerir categoria (aprendendo com compras já categorizadas) → detectar duplicados e parcelas
//   → tela de revisão → confirmar. Tudo local; nenhum dado sai do aparelho.
//
// IMPORTANTE: os formatos NÃO são adivinhados. Os leitores só serão escritos com exemplos reais
// anonimizados em samples/ (ver samples/LEIA-ME.md).

import itau from './parsers/itau.js';
import nubank from './parsers/nubank.js';

export const PARSERS = [...itau, ...nubank];

export class NotImplementedYet extends Error {
  constructor(bank) { super(`O leitor de extratos do ${bank} chega na próxima fase.`); this.name = 'NotImplementedYet'; }
}

/** Escolhe o leitor mais provável para um arquivo. */
export function pickParser(file) {
  const scored = PARSERS.map((p) => ({ p, s: p.detect(file) || 0 })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  return scored[0]?.p || null;
}
