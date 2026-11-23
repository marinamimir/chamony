// Backup manual do ChaMony (exportar/importar JSON) + detecção de arquivos do AeroSync.

import { SCHEMA, migrate } from '../store.js';
import { todayISO } from '../core/dates.js';
import * as aero from './aerosync.js';

export const MAX_FILE = 25 * 1024 * 1024;

export function makeBackup(data) {
  const { _recovered, ...clean } = data;
  return { app: 'ChaMony', kind: 'backup', schema: SCHEMA, exportedAt: new Date().toISOString(), data: clean };
}

export function backupFileName() { return `chamony-backup-${todayISO()}.json`; }

/** Baixa o backup como arquivo. Retorna o File (útil para compartilhar). */
export function downloadBackup(data) {
  const json = JSON.stringify(makeBackup(data), null, 2);
  const file = new File([json], backupFileName(), { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return file;
}

/** No Android, abre o menu de compartilhar (Drive, e-mail, WhatsApp…) com o arquivo. */
export async function shareBackup(data) {
  const json = JSON.stringify(makeBackup(data), null, 2);
  const file = new File([json], backupFileName(), { type: 'application/json' });
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
  if (json?.app === 'ChaMony' && json.data) return { type: 'chamony', data: migrate(json.data), exportedAt: json.exportedAt };
  if (json?.schema && Array.isArray(json.expenses) && json.settings) return { type: 'chamony', data: migrate(json) };
  const found = aero.detect(json);
  if (found) return { type: 'aerosync', found };
  throw new Error('Não reconheci esse arquivo. Use um backup do ChaMony ou do AeroSync.');
}
