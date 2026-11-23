// Testa os leitores de extrato com os PDFs falsos de samples/ (precisa do app servido em http://localhost:8123).
// Uso: npx http-server -p 8123 . &  NODE_PATH=$(npm root -g) node tools/test-import.mjs [arquivo.pdf ...]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2).length ? process.argv.slice(2)
  : ['samples/itau/conta.exemplo.pdf', 'samples/itau/cartao.exemplo.pdf', 'samples/nubank/conta.exemplo.csv', 'samples/nubank/Nubank_2026-12-04.exemplo.csv'].map((f) => path.join(root, f));
const EXPECT = {
  'conta.exemplo.pdf': { parser: 'itau-conta', lines: 9, types: { 'card-payment': 2, transfer: 1, income: 1, 'income-other': 1, expense: 4 } },
  'cartao.exemplo.pdf': { parser: 'itau-cartao', lines: 8, checked: true, last4: '4321', billYM: '2026-11', upcoming: 2 },
  'conta.exemplo.csv': { parser: 'nubank-conta', lines: 5, types: { 'income-other': 2, expense: 2, 'card-payment': 1 } },
  'Nubank_2026-12-04.exemplo.csv': { parser: 'nubank-cartao', lines: 6, billYM: '2026-11', types: { expense: 4, 'card-payment': 1, refund: 1 } },
};

const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:8123/icons/logo.svg');
let fail = 0;
for (const f of files) {
  const b64 = readFileSync(f).toString('base64');
  const r = await p.evaluate(async ([b64, name]) => {
    const { readFile, pickParser } = await import('/js/import/pipeline.js');
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const input = await readFile(new File([bin], name, { type: name.endsWith('.pdf') ? 'application/pdf' : 'text/csv' }));
    const parser = pickParser(input);
    if (!parser) return { parser: null };
    const out = await parser.parse(input);
    const types = {};
    out.lines.forEach((l) => { types[l.type] = (types[l.type] || 0) + 1; });
    return { parser: parser.id, lines: out.lines.length, types, meta: out.meta, upcoming: out.upcoming?.length || 0 };
  }, [b64, path.basename(f)]);
  const exp = EXPECT[path.basename(f)];
  const errors = [];
  if (exp) {
    if (r.parser !== exp.parser) errors.push(`leitor ${r.parser} ≠ ${exp.parser}`);
    if (r.lines !== exp.lines) errors.push(`linhas ${r.lines} ≠ ${exp.lines}`);
    if (exp.types) for (const [k, v] of Object.entries(exp.types)) if ((r.types?.[k] || 0) !== v) errors.push(`${k}: ${r.types?.[k] || 0} ≠ ${v}`);
    if (exp.checked !== undefined && r.meta?.checked !== exp.checked) errors.push(`conferência ${r.meta?.checked} (soma ${r.meta?.sum} / total ${r.meta?.total})`);
    if (exp.last4 && r.meta?.last4 !== exp.last4) errors.push(`final ${r.meta?.last4}`);
    if (exp.billYM && r.meta?.billYM !== exp.billYM) errors.push(`mês ${r.meta?.billYM}`);
    if (exp.upcoming !== undefined && r.upcoming !== exp.upcoming) errors.push(`próximas ${r.upcoming}`);
  }
  console.log(`${errors.length ? '✗' : '✓'} ${path.basename(f)} → ${r.parser} · ${r.lines} linhas ${JSON.stringify(r.types)}${errors.length ? `\n   ${errors.join('\n   ')}` : ''}`);
  fail += errors.length;
}
await b.close();
process.exit(fail ? 1 : 0);
