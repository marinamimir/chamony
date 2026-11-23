// Datas no formato ISO local (AAAA-MM-DD) e meses (AAAA-MM).

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const currentYM = () => todayISO().slice(0, 7);
export const isISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime());
export const isYM = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export function parseISO(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function shiftYM(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function formatYM(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
export function monthName(ym) { return MONTHS[Number(ym.slice(5, 7)) - 1]; }
export function shortYM(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3).toLowerCase()}/${String(y).slice(2)}`;
}
export function addDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
export function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 864e5); }
export function daysInMonth(ym) { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); }
/** Dia "d" no mês ym, ajustado para o último dia se o mês for mais curto (ex.: dia 31 em fevereiro). */
export function dateInMonth(ym, d) { return `${ym}-${pad(Math.min(Math.max(1, d), daysInMonth(ym)))}`; }

/** "23 nov" */
export function shortDate(iso) {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}`;
}
/** "Hoje", "Ontem", "segunda, 23 nov" */
export function friendlyDay(iso) {
  const t = todayISO();
  if (iso === t) return 'Hoje';
  if (iso === addDays(t, -1)) return 'Ontem';
  if (iso === addDays(t, 1)) return 'Amanhã';
  return `${WEEKDAYS[parseISO(iso).getDay()]}, ${shortDate(iso)}`;
}
/** "hoje", "amanhã", "em 3 dias" */
export function inDays(n) {
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n < 0) return n === -1 ? 'ontem' : `há ${-n} dias`;
  return `em ${n} dias`;
}
