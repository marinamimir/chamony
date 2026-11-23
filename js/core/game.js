// Gamificação gentil: sequências, selos, níveis e o jardim de camomilas.
// Tudo é calculado a partir dos dados (nada de pontos "soltos"); só a data de cada selo fica guardada.

import { todayISO, addDays, shiftYM, currentYM, toISO } from './dates.js';
import * as F from './finance.js';

const IMPORTED = /^(aerosync|colado|sub:)/;
const localDay = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : toISO(d); };

export function stats(d, today = todayISO()) {
  // Dias em que a pessoa registrou algo à mão (compras criadas no app).
  const days = new Set(d.expenses.concat(d.trash)
    .filter((e) => !e.imp && !IMPORTED.test(e.source || '') && e.instIndex === 1)
    .map((e) => localDay(e.createdAt)).filter(Boolean));
  let streak = 0;
  let cur = days.has(today) ? today : addDays(today, -1); // a sequência só quebra se ontem também ficou vazio
  while (days.has(cur)) { streak += 1; cur = addDays(cur, -1); }
  let best = 0, run = 0, prev = null;
  [...days].sort().forEach((x) => { run = prev && addDays(prev, 1) === x ? run + 1 : 1; best = Math.max(best, run); prev = x; });

  const ym = currentYM();
  const past = Array.from({ length: 24 }, (_, i) => shiftYM(ym, -(i + 1)));
  const monthsBlue = past.filter((k) => F.spent(d, k) > 0 && F.freeBalance(d, k) >= 0).length;
  const monthsInLimit = d.budget.monthlyLimit ? past.filter((k) => { const s = F.spent(d, k); return s > 0 && s <= d.budget.monthlyLimit; }).length : 0;
  let invoicesUnder = 0;
  for (const c of d.cards.filter((x) => x.limit)) for (const k of past.slice(0, 12)) { const v = F.invoice(d, c.id, k); if (v > 0 && v <= c.limit) invoicesUnder += 1; }
  const groups = new Set(d.expenses.map((e) => e.groupId)).size;

  return {
    days: days.size, streak, best: Math.max(best, streak),
    noSpend: F.daysWithoutSpending(d, today) ?? 0,
    monthsBlue, monthsInLimit, invoicesUnder, purchases: groups,
    goalsDone: d.goals.filter((g) => g.doneAt).length,
    deposits: d.goals.reduce((s, g) => s + g.deposits.filter((x) => x.amount > 0).length, 0),
    debtsClosed: d.debts.filter((x) => x.closedAt).length,
    investments: d.investments.length,
    catLimits: Object.keys(d.budget.catLimits || {}).length,
    tagged: d.expenses.filter((e) => e.tags?.length || e.note).length,
  };
}

/** Selos. `pts` soma no nível; `art` escolhe a ilustração da comemoração. */
export const BADGES = [
  { id: 'primeiro-registro', name: 'Primeira pétala', desc: 'Registrou o primeiro gasto', icon: 'fa-seedling', color: '#CDEBC5', pts: 10, test: (s) => s.days >= 1 },
  { id: 'seq-3', name: 'Semente regada', desc: '3 dias seguidos registrando', icon: 'fa-droplet', color: '#BCD7F5', pts: 15, test: (s) => s.best >= 3 },
  { id: 'seq-7', name: 'Broto firme', desc: '7 dias seguidos registrando', icon: 'fa-leaf', color: '#BFE3D0', pts: 30, test: (s) => s.best >= 7 },
  { id: 'seq-30', name: 'Camomila em flor', desc: '30 dias seguidos registrando', icon: 'fa-spa', color: '#FFF0B3', pts: 80, test: (s) => s.best >= 30 },
  { id: 'pausa-3', name: 'Pausa pro chá', desc: '3 dias sem gastar', icon: 'fa-mug-hot', color: '#FFD9B8', pts: 15, test: (s) => s.noSpend >= 3 },
  { id: 'pausa-7', name: 'Semana serena', desc: '7 dias sem gastar', icon: 'fa-cloud-sun', color: '#D6D0F5', pts: 40, test: (s) => s.noSpend >= 7 },
  { id: 'azul-1', name: 'Mês no azul', desc: 'Fechou um mês com saldo positivo', icon: 'fa-sun', color: '#BCD7F5', pts: 30, test: (s) => s.monthsBlue >= 1 },
  { id: 'azul-3', name: 'Céu limpo', desc: '3 meses no azul', icon: 'fa-rainbow', color: '#E4D4F4', pts: 60, test: (s) => s.monthsBlue >= 3 },
  { id: 'limite-1', name: 'Na medida', desc: 'Fechou um mês dentro do limite', icon: 'fa-bullseye', color: '#F9C5D1', pts: 30, test: (s) => s.monthsInLimit >= 1 },
  { id: 'fatura-leve', name: 'Fatura leve', desc: 'Fatura abaixo do limite do cartão', icon: 'fa-feather', color: '#F5D0E8', pts: 20, test: (s) => s.invoicesUnder >= 1 },
  { id: 'cofrinho', name: 'Cofrinho', desc: 'Guardou dinheiro numa meta', icon: 'fa-piggy-bank', color: '#FFD9B8', pts: 15, test: (s) => s.deposits >= 1 },
  { id: 'meta-1', name: 'Meta florida', desc: 'Bateu uma meta de economia', icon: 'fa-trophy', color: '#FFF0B3', pts: 60, test: (s) => s.goalsDone >= 1 },
  { id: 'meta-3', name: 'Buquê de metas', desc: 'Bateu 3 metas', icon: 'fa-crown', color: '#F5CF7A', pts: 120, test: (s) => s.goalsDone >= 3 },
  { id: 'divida', name: 'Peso a menos', desc: 'Quitou uma dívida', icon: 'fa-feather-pointed', color: '#CDEBC5', pts: 50, test: (s) => s.debtsClosed >= 1 },
  { id: 'investe', name: 'Raiz forte', desc: 'Registrou um investimento', icon: 'fa-tree', color: '#BFE3D0', pts: 20, test: (s) => s.investments >= 1 },
  { id: 'jardineira', name: 'Canteiros', desc: 'Definiu limite para uma categoria', icon: 'fa-border-all', color: '#D9D9E3', pts: 15, test: (s) => s.catLimits >= 1 },
  { id: 'detalhista', name: 'Caderninho', desc: '10 compras com nota ou tag', icon: 'fa-book-open', color: '#E4D4F4', pts: 20, test: (s) => s.tagged >= 10 },
  { id: 'cem', name: 'Cem pétalas', desc: '100 compras registradas', icon: 'fa-star', color: '#F5CF7A', pts: 60, test: (s) => s.purchases >= 100 },
];

export const LEVELS = [
  [0, 'Semente'], [30, 'Broto'], [80, 'Folhinha'], [160, 'Botão'], [300, 'Flor'], [500, 'Buquê'], [800, 'Jardim'], [1200, 'Campo florido'],
];

export function xp(d, s = stats(d)) {
  const badgePts = BADGES.filter((b) => d.game.unlocked[b.id]).reduce((t, b) => t + b.pts, 0);
  return badgePts + Math.min(s.days, 365) * 2;
}

export function level(points) {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1][0]) i += 1;
  const [from, name] = LEVELS[i];
  const next = LEVELS[i + 1];
  return { index: i + 1, name, from, next: next?.[0] ?? null, nextName: next?.[1] ?? null, progress: next ? (points - from) / (next[0] - from) : 1 };
}

/** Selos conquistados agora que ainda não estavam guardados. */
export function newlyEarned(d, s = stats(d)) {
  return BADGES.filter((b) => !d.game.unlocked[b.id] && b.test(s));
}
