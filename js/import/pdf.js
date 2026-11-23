// Leitura de PDF 100% local com pdf.js (vendor/pdfjs, versão fixa). Nada sai do aparelho.
// Devolve os pedaços de texto com posição, para os leitores de cada banco montarem linhas e colunas.

let lib = null;
async function pdfjs() {
  if (!lib) {
    lib = await import('../../vendor/pdfjs/pdf.min.mjs');
    lib.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  }
  return lib;
}

export class PasswordNeeded extends Error {
  constructor(wrong = false) { super(wrong ? 'Senha incorreta.' : 'Este PDF tem senha.'); this.name = 'PasswordNeeded'; this.wrong = wrong; }
}

/**
 * @returns {Promise<{ pages: Array<{ n:number, width:number, height:number, items: Array<{ s:string, x:number, y:number, w:number, h:number }> }>, text: string }>}
 * Coordenadas com origem no canto superior esquerdo (y cresce para baixo).
 */
export async function readPdf(buffer, password) {
  const { getDocument, PasswordResponses } = await pdfjs();
  const task = getDocument({ data: new Uint8Array(buffer), password, isEvalSupported: false, disableFontFace: true, useSystemFonts: false });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    if (err?.name === 'PasswordException') throw new PasswordNeeded(err.code === PasswordResponses?.INCORRECT_PASSWORD);
    throw new Error('Não consegui ler este PDF.');
  }
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({
      s: it.str.replace(/\s+/g, ' ').trim(),
      x: it.transform[4],
      y: vp.height - it.transform[5],
      w: it.width,
      h: Math.abs(it.transform[3]) || it.height || 8,
    }));
    pages.push({ n, width: vp.width, height: vp.height, items });
    page.cleanup();
  }
  await doc.destroy();
  return { pages, text: pages.map((p) => toRows(p.items).map((r) => joinItems(r.items)).join('\n')).join('\n') };
}

/** Agrupa itens em linhas (mesmo y, com tolerância) e ordena cada linha por x. */
export function toRows(items, tol = 2.5) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const it of sorted) {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= tol);
    if (row) row.items.push(it); else rows.push({ y: it.y, items: [it] });
  }
  rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));
  return rows.sort((a, b) => a.y - b.y);
}

/** Junta os pedaços de uma linha (letras acentuadas às vezes vêm em pedaços separados). */
export function joinItems(items) {
  let out = '';
  items.forEach((it, i) => {
    const prev = items[i - 1];
    const gap = prev ? it.x - (prev.x + prev.w) : 0;
    out += !prev ? it.s : gap < 1.5 ? it.s : ` ${it.s}`;
  });
  return out.replace(/\s+/g, ' ').trim();
}
