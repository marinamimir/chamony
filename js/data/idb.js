// IndexedDB mínimo para arquivos grandes (fotos de comprovante). Os dados financeiros seguem no localStorage.

const DB = 'chamony', STORE = 'receipts', VERSION = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Este navegador não guarda fotos (sem IndexedDB).'));
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  }));
}

export const putReceipt = (rec) => tx('readwrite', (s) => s.put(rec));
export const getReceipt = (id) => tx('readonly', (s) => s.get(id));
export const deleteReceipt = (id) => tx('readwrite', (s) => s.delete(id));
export const allReceipts = () => tx('readonly', (s) => s.getAll());

/** Reduz a foto (lado maior até 1600px, JPEG ~72%) para não lotar o aparelho. */
export async function compressImage(file, max = 1600, quality = 0.72) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

export const blobToDataURL = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(blob);
});
export function dataURLToBlob(url) {
  const [head, b64] = String(url).split(',');
  const type = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(b64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
