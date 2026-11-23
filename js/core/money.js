// Dinheiro: o ChaMony guarda tudo em CENTAVOS inteiros. Só BRL por enquanto.

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_INT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRL_SHORT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

/** Centavos → "R$ 1.234,56" (texto puro). */
export function fmt(cents, { sign = false } = {}) {
  const v = Number.isFinite(cents) ? cents : 0;
  const s = BRL.format(v / 100).replace(/ /g, ' ');
  return sign && v > 0 ? '+' + s : s;
}

/** Versão compacta para eixos de gráfico ("R$ 1,2 mil"). */
export function fmtShort(cents) {
  return BRL_SHORT.format((cents || 0) / 100).replace(/ /g, ' ');
}

/** Valor dentro de <span class="m"> — pode ser escondido pelo ícone de olho. */
export function m(cents, opts) {
  return `<span class="m num"><span class="mv">${fmt(cents, opts)}</span></span>`;
}

/**
 * Texto digitado → centavos. Aceita "12,50", "12.50", "1.250,00", "1250", "R$ 9,9".
 * Retorna NaN se não houver número.
 */
export function parseBRL(input) {
  if (typeof input === 'number') return Math.round(input * 100);
  let s = String(input ?? '').replace(/[^\d,.-]/g, '').trim();
  if (!s) return NaN;
  const neg = s.startsWith('-');
  s = s.replace(/-/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  const v = Math.round(parseFloat(s) * 100);
  return Number.isFinite(v) ? (neg ? -v : v) : NaN;
}

/** Reais (número decimal, formato do AeroSync) → centavos. */
export function reaisToCents(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Divide um total em N parcelas de centavos; a diferença do arredondamento vai para a 1ª parcela (como os bancos fazem). */
export function splitInstallments(total, n) {
  n = Math.max(1, n | 0);
  const base = Math.floor(total / n);
  const parts = Array(n).fill(base);
  parts[0] += total - base * n;
  return parts;
}

/** Centavos → "1234,56" para preencher inputs. */
export function toInput(cents) {
  if (!Number.isFinite(cents)) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Máscara de moeda para <input inputmode="numeric">: o usuário digita só números
 * e o valor "anda" da direita para a esquerda (como nos apps de banco).
 */
export function attachMoneyMask(input, initialCents = 0) {
  let cents = Math.max(0, initialCents | 0);
  const render = () => { input.value = fmt(cents); };
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('beforeinput', (e) => {
    e.preventDefault();
    if (e.inputType.startsWith('delete')) cents = Math.floor(cents / 10);
    else if (e.data) {
      const digits = e.data.replace(/\D/g, '');
      for (const d of digits) if (cents < 1e11) cents = cents * 10 + Number(d);
    }
    render();
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const v = parseBRL(e.clipboardData.getData('text'));
    if (Number.isFinite(v)) { cents = Math.abs(v); render(); }
  });
  input.addEventListener('focus', () => requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length)));
  render();
  return { get: () => cents, set: (v) => { cents = Math.max(0, v | 0); render(); } };
}
