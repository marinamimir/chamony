// Confere se todo arquivo do app está no APP_SHELL do sw.js (para funcionar offline).
// Uso: node tools/check-sw.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
const listed = new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter((f) => !f.startsWith('__')));
const walk = (dir) => readdirSync(path.join(root, dir)).flatMap((f) => {
  const rel = path.posix.join(dir, f);
  return statSync(path.join(root, rel)).isDirectory() ? walk(rel) : [rel];
});
const files = [...walk('js'), ...walk('css'), 'index.html', 'manifest.webmanifest'];
const missing = files.filter((f) => f.match(/\.(js|css|html|webmanifest)$/) && !f.startsWith('js/import/') && !listed.has(f));
const ghost = [...listed].filter((f) => f && !(() => { try { return statSync(path.join(root, f)).isFile(); } catch { return false; } })());
if (missing.length) console.log('Faltando no APP_SHELL:\n  ' + missing.join('\n  '));
if (ghost.length) console.log('Listados mas inexistentes:\n  ' + ghost.join('\n  '));
if (!missing.length && !ghost.length) console.log('sw.js ok: todos os arquivos listados.');
process.exit(missing.length || ghost.length ? 1 : 0);
