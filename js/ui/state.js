// Estado só da interface (não é salvo): mês selecionado, filtros, seleção em massa, valores escondidos.
import { currentYM } from '../core/dates.js';
import { emptyFilter } from '../core/finance.js';

export const ui = {
  ym: currentYM(),
  filter: emptyFilter(),
  hidden: false,
  bulk: { on: false, sel: new Set() },
  homeExpanded: false,
};

export function setHidden(v) {
  ui.hidden = v;
  document.documentElement.classList.toggle('hide-values', v);
}
