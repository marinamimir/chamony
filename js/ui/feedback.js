// Retorno sensorial: sons suaves (Web Audio, sem arquivos), vibração e a folha de comemoração.

import * as store from '../store.js';
import { esc } from '../core/dom.js';
import { art } from './illustrations.js';
import { openSheet } from './sheet.js';

let ctx = null;
function audio() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Notas curtinhas, tipo sininho de xícara. */
const SONGS = {
  tap: [[880, 0, 0.06]],
  save: [[660, 0, 0.09], [990, 0.07, 0.12]],
  success: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.28]],
  soft: [[440, 0, 0.12]],
};

export function sound(kind = 'tap') {
  if (!store.get()?.settings.sound) return;
  const a = audio();
  if (!a) return;
  const now = a.currentTime;
  for (const [freq, at, dur] of SONGS[kind] || SONGS.tap) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(0.08, now + at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    o.connect(g).connect(a.destination);
    o.start(now + at); o.stop(now + at + dur + 0.02);
  }
}

const PATTERNS = { tap: 8, save: 14, success: [18, 60, 18, 60, 30], soft: 10 };
export function vibrate(kind = 'tap') {
  if (!store.get()?.settings.vibration || !navigator.vibrate) return;
  try { navigator.vibrate(PATTERNS[kind] || 10); } catch { /* ignore */ }
}

export function feedback(kind = 'tap') { sound(kind); vibrate(kind); }

/** Folha de comemoração (meta batida, conquista nova…). */
export function celebrate(title, text, { artName = 'garden', extra = '' } = {}) {
  feedback('success');
  openSheet({
    title: 'Que lindo!',
    body: `<div class="empty celebrate">${art(artName)}<b>${esc(title)}</b><p>${esc(text)}</p>${extra}</div>`,
    foot: '<button type="button" class="btn primary block" data-sheet-close>Seguir florescendo 🌼</button>',
  });
}
