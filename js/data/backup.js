// Backup manual do ChaMony (exportar/importar JSON) + detecção de arquivos do AeroSync.

import { SCHEMA, migrate } from '../store.js';
import { todayISO } from '../core/dates.js';
import * as aero from './aerosync.js';
import { allReceipts, putReceipt, blobToDataURL, dataURLToBlob } from './idb.js';

export const MAX_FILE = 25 * 1024 * 1024;

/** Fotos de comprovante usadas pelas compras, em base64 (para irem junto no arquivo). */
async function collectReceipts(data) {
  const used = new Set([...data.expenses, ...data.trash].map((e) => e.receiptId).filter(Boolean));
  if (!used.size) return [];
  const all = await allReceipts().catch(() => []);
  return Promise.all(all.filter((r) => used.has(r.id)).map(async (r) => ({ id: r.id, createdAt: r.createdAt, dataURL: await blobToDataURL(r.blob) })));
}

/** Grava as fotos que vieram num arquivo (backup ou sincronização). */
export async function restoreReceipts(list) {
  for (const r of list || []) {
    if (!r?.id || typeof r.dataURL !== 'string' || !r.dataURL.startsWith('data:image/')) continue;
    await putReceipt({ id: String(r.id).slice(0, 80), createdAt: r.createdAt || new Date().toISOString(), blob: dataURLToBlob(r.dataURL) }).catch(() => {});
  }
}

export async function makeBackup(data, kind = 'backup') {
  const { _recovered, ...clean } = data;
  return { app: 'ChaMony', kind, schema: SCHEMA, exportedAt: new Date().toISOString(), data: clean, receipts: await collectReceipts(clean) };
}

export function backupFileName(kind = 'backup') { return kind === 'sync' ? 'chamony-sincronizacao.json' : `chamony-backup-${todayISO()}.json`; }

async function makeFile(data, kind) {
  const json = JSON.stringify(await makeBackup(data, kind));
  return new File([json], backupFileName(kind), { type: 'application/json' });
}

/** Baixa o backup como arquivo. */
export async function downloadBackup(data, kind = 'backup') {
  const file = await makeFile(data, kind);
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return file;
}

/** No Android, abre o menu de compartilhar (Drive, e-mail, WhatsApp…) com o arquivo. */
export async function shareBackup(data, kind = 'backup') {
  const file = await makeFile(data, kind);
  if (!navigator.canShare?.({ files: [file] })) return false;
  await navigator.share({ files: [file], title: 'Backup do ChaMony' });
  return true;
}
export const canShareFiles = () => {
  try { return !!navigator.canShare?.({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] }); } catch { return false; }
};

export function readFileText(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE) return reject(new Error('Arquivo muito grande (limite de 25 MB).'));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    r.readAsText(file);
  });
}

/**
 * Identifica o conteúdo de um arquivo JSON.
 * @returns {{ type: 'chamony', data } | { type: 'aerosync', found } }
 */
export function identify(text) {
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Esse arquivo não é um JSON válido.'); }
  if (json?.app === 'ChaMony' && json.data) return { type: 'chamony', data: migrate(json.data), exportedAt: json.exportedAt, kind: json.kind, receipts: Array.isArray(json.receipts) ? json.receipts : [] };
  if (json?.schema && Array.isArray(json.expenses) && json.settings) return { type: 'chamony', data: migrate(json) };
  const found = aero.detect(json);
  if (found) return { type: 'aerosync', found };
  throw new Error('Não reconheci esse arquivo. Use um backup do ChaMony ou do AeroSync.');
}
