// Conquistas: nível, jardim de camomilas, selos e sequências. O estilo segue Ajustes → Conquistas.

import * as store from '../store.js';
import { esc, plural, safeColor } from '../core/dom.js';
import { shortDate } from '../core/dates.js';
import * as G from '../core/game.js';
import { gardenSVG } from '../ui/garden.js';
import { chip, sectionHead } from '../ui/parts.js';
import { celebrate } from '../ui/feedback.js';
import { toast } from '../ui/toast.js';
import { whenIdle } from '../ui/sheet.js';

export function gardenOf(d, s = G.stats(d)) {
  const earned = G.BADGES.filter((b) => d.game.unlocked[b.id]).length;
  return { flowers: earned, buds: Math.min(s.streak, 21), butterflies: s.goalsDone, sun: s.monthsBlue > 0 || s.noSpend >= 3 };
}

/** Cartão pequeno para o Início. */
export function homeAchievementsCard(d) {
  const mode = d.settings.achievements;
  const s = G.stats(d);
  const lv = G.level(G.xp(d, s));
  return `<a class="card ach-mini" href="#/conquistas">
    ${mode !== 'badges' ? `<div class="ach-mini__garden">${gardenSVG(gardenOf(d, s), { height: 120 })}</div>` : ''}
    <div class="row">
      ${mode !== 'garden' ? chip('#FFF0B3', 'fa-spa') : ''}
      <div class="grow"><div class="card-title">${mode === 'garden' ? 'Seu jardim' : `Nível ${lv.index} · ${esc(lv.name)}`}</div>
        <div class="tiny muted">${s.streak ? `${plural(s.streak, 'dia', 'dias')} seguidos registrando` : 'Registre hoje para começar uma sequência'}${s.noSpend >= 1 ? ` · ${plural(s.noSpend, 'dia', 'dias')} sem gastar` : ''}</div></div>
      <i class="fas fa-chevron-right subtle"></i>
    </div>
    ${mode !== 'garden' && lv.next ? `<div class="bar mt-2" style="height:7px"><i style="width:${lv.progress * 100}%;--c:#F5CF7A"></i></div>` : ''}
  </a>`;
}

/** Confere selos novos após cada alteração. Celebra um por vez; se forem muitos (ex.: importação), só avisa. */
export function checkUnlocks() {
  whenIdle(runUnlocks);
}
function runUnlocks() {
  const d = store.get();
  const fresh = G.newlyEarned(d);
  if (!fresh.length) return;
  const now = new Date().toISOString();
  store.commit((s) => { fresh.forEach((b) => { s.game.unlocked[b.id] = now; }); });
  if (fresh.length > 2) { toast(`${fresh.length} conquistas desbloqueadas 🌼`, { action: { label: 'Ver', fn: () => { location.hash = '#/conquistas'; } } }); return; }
  const b = fresh[0];
  celebrate(`Conquista: ${b.name}`, `${b.desc}. Uma flor nova no seu jardim.`, {
    artName: 'garden',
    extra: fresh.length > 1 ? `<p class="tiny muted mt-2">E também: ${esc(fresh.slice(1).map((x) => x.name).join(', '))}.</p>` : '',
  });
}

export default {
  id: 'conquistas',
  title: 'Conquistas',
  render({ d }) {
    const mode = d.settings.achievements;
    const s = G.stats(d);
    const points = G.xp(d, s);
    const lv = G.level(points);
    const earned = G.BADGES.filter((b) => d.game.unlocked[b.id]);
    return `
      ${mode !== 'badges' ? `<section class="card garden-card">${gardenSVG(gardenOf(d, s))}
        <p class="tiny muted center mt-2">Cada conquista abre uma camomila. Os botões são seus dias seguidos registrando${s.goalsDone ? ', e as borboletas, metas batidas' : ''}.</p></section>` : ''}
      ${mode !== 'garden' ? `<section class="card mt-3">
        <div class="row">${chip('#FFF0B3', 'fa-spa', 'lg')}<div class="grow"><div class="label" style="margin:0">Nível ${lv.index}</div><div class="strong" style="font-size:1.25rem">${esc(lv.name)}</div></div>
          <div class="center"><b class="num strong">${points}</b><div class="tiny subtle">pétalas</div></div></div>
        ${lv.next ? `<div class="bar mt-3"><i style="width:${lv.progress * 100}%;--c:#F5CF7A"></i></div><p class="tiny muted mt-2">Faltam ${lv.next - points} pétalas para <b>${esc(lv.nextName)}</b>.</p>` : '<p class="tiny muted mt-2">Nível máximo. Que campo lindo!</p>'}
      </section>` : ''}
      ${sectionHead('Seus hábitos')}
      <div class="grid-2">
        <div class="stat"><span>Sequência</span><b>${plural(s.streak, 'dia', 'dias')}</b></div>
        <div class="stat"><span>Melhor sequência</span><b>${plural(s.best, 'dia', 'dias')}</b></div>
        <div class="stat"><span>Sem gastar</span><b>${plural(s.noSpend, 'dia', 'dias')}</b></div>
        <div class="stat"><span>Meses no azul</span><b>${s.monthsBlue}</b></div>
      </div>
      ${mode !== 'garden' ? `${sectionHead(`Selos (${earned.length}/${G.BADGES.length})`)}
      <div class="badge-grid">${G.BADGES.map((b) => { const at = d.game.unlocked[b.id]; return `
        <div class="badge-tile ${at ? '' : 'is-locked'}" title="${esc(b.desc)}">
          <span class="badge-tile__ico" style="--c:${safeColor(b.color)}"><i class="fas ${at ? b.icon : 'fa-lock'}"></i></span>
          <b>${esc(b.name)}</b><small>${at ? `desde ${esc(shortDate(at.slice(0, 10)))}` : esc(b.desc)}</small>
        </div>`; }).join('')}</div>` : ''}`;
  },
};
