// Frases de apoio. Tom: 'warm' (acolhedor, padrão), 'neutral' ou 'playful'. Alertas sempre suaves.
import { fmt } from '../core/money.js';

const M = (c) => `<span class="m"><span class="mv">${fmt(c)}</span></span>`;

const PHRASES = {
  free: {
    warm: { pos: (v) => `Respira, ainda sobram ${M(v)} este mês.`, zero: () => 'Mês certinho até aqui. Com calma, tudo se ajeita.', neg: (v) => `Tudo bem, dá pra reorganizar: faltam ${M(-v)} para fechar no azul.` },
    neutral: { pos: (v) => `Disponível no mês: ${M(v)}.`, zero: () => 'Saldo do mês zerado.', neg: (v) => `Saldo do mês: ${M(v)}.` },
    playful: { pos: (v) => `Sobram ${M(v)} pra regar o jardim. 🌼`, zero: () => 'Tudo na medida, que nem chá na xícara.', neg: (v) => `As pétalas caíram um pouco: ${M(-v)} no vermelho. Bora replantar?` },
  },
  limit: {
    warm: { ok: () => 'Seu limite está tranquilo.', near: () => 'Pertinho do limite. Vai com carinho.', over: () => 'Passou um pouquinho do limite, sem culpa. Dá pra ajustar.' },
    neutral: { ok: () => 'Dentro do limite.', near: () => 'Acima de 80% do limite.', over: () => 'Limite ultrapassado.' },
    playful: { ok: () => 'Limite florido e feliz.', near: () => 'Opa, o vaso tá quase cheio!', over: () => 'O vaso transbordou um tiquinho.' },
  },
  greet: {
    warm: ['Bom dia', 'Boa tarde', 'Boa noite'],
    neutral: ['Bom dia', 'Boa tarde', 'Boa noite'],
    playful: ['Bom dia, flor', 'Boa tarde, flor', 'Boa noite, flor'],
  },
};

export function freePhrase(tone, value) {
  const t = PHRASES.free[tone] || PHRASES.free.warm;
  return value > 0 ? t.pos(value) : value === 0 ? t.zero() : t.neg(value);
}
export function limitPhrase(tone, ratio) {
  const t = PHRASES.limit[tone] || PHRASES.limit.warm;
  return ratio > 1 ? t.over() : ratio >= 0.8 ? t.near() : t.ok();
}
export function greeting(tone) {
  const h = new Date().getHours();
  const g = PHRASES.greet[tone] || PHRASES.greet.warm;
  return h < 12 ? g[0] : h < 18 ? g[1] : g[2];
}
