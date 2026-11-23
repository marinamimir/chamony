// Simulador de compras e parcelamento (juros compostos opcionais) e o impacto no saldo do mês.

import * as store from '../store.js';
import { esc, uid, clampInt } from '../core/dom.js';
import { m, attachMoneyMask } from '../core/money.js';
import { formatYM } from '../core/dates.js';
import * as F from '../core/finance.js';
import { monthBar, sectionHead, chip } from '../ui/parts.js';
import { emptyState } from '../ui/illustrations.js';
import { toast } from '../ui/toast.js';

export default {
  id: 'simulador',
  title: 'Simulador',
  render({ d, ui }) {
    const free = F.freeBalance(d, ui.ym);
    const monthly = F.sum(d.simItems, 'monthly');
    const after = free - monthly;
    return `${monthBar(ui.ym)}
      <section class="card">
        <div class="card-title mb-3">E se eu comprar…?</div>
        <label class="field"><span>Item</span><input class="input" id="sim-name" maxlength="80" placeholder="Ex.: fone novo, viagem"></label>
        <label class="field"><span>Valor total</span><input class="input money" id="sim-val"></label>
        <div class="input-row">
          <label class="field"><span>Parcelas</span><input class="input" id="sim-inst" type="number" inputmode="numeric" min="1" max="120" value="1"></label>
          <label class="field"><span>Juros % ao mês</span><input class="input" id="sim-rate" type="number" inputmode="decimal" step="0.1" min="0" value="0"></label>
        </div>
        <button type="button" class="btn primary block" data-act="add-sim"><i class="fas fa-plus"></i>Adicionar à simulação</button>
      </section>
      ${sectionHead(`Impacto em ${formatYM(ui.ym).toLowerCase()}`)}
      <section class="card">
        <div class="kv"><span>Saldo livre agora</span><b>${m(free)}</b></div>
        <div class="kv"><span>Parcelas simuladas por mês</span><b class="neg">−${m(monthly)}</b></div>
        <div class="kv total"><span>Saldo livre depois</span><b class="${after < 0 ? 'neg' : 'pos'}">${m(after)}</b></div>
        <p class="tiny subtle mt-2">Custo total dos itens simulados: ${m(F.sum(d.simItems, 'totalWithInterest'))}</p>
      </section>
      ${sectionHead(`Itens (${d.simItems.length})`, d.simItems.length ? '<button type="button" class="link-btn" data-act="clear-sim">Limpar tudo</button>' : '')}
      ${d.simItems.length ? `<div class="list">${d.simItems.map((s) => `
        <div class="list-row">${chip('#D6D0F5', 'fa-calculator')}
          <div class="list-row__main"><div class="list-row__title">${esc(s.name)}</div>
            <div class="list-row__meta">${s.inst}x de ${m(s.monthly)} ${s.rate > 0 ? `· ${String(s.rate).replace('.', ',')}% a.m. · total ${m(s.totalWithInterest)}` : '· sem juros'}</div></div>
          <button type="button" class="icon-btn sm danger" data-act="del-sim" data-id="${esc(s.id)}" aria-label="Remover"><i class="fas fa-xmark"></i></button>
        </div>`).join('')}</div>` : `<div class="card">${emptyState('sprout', 'Nada simulado', 'Simule antes de comprar e veja como fica o mês. Nada aqui vira gasto de verdade.')}</div>`}`;
  },
  mount(root) {
    const inp = root.querySelector('#sim-val');
    if (inp) root._simMoney = attachMoneyMask(inp, 0);
  },
  actions: {
    'add-sim': (_, { root }) => {
      const total = root._simMoney?.get() || 0;
      if (!(total > 0)) { toast('Digite o valor do item'); return; }
      const inst = clampInt(root.querySelector('#sim-inst').value, 1, 120, 1);
      const rate = Math.max(0, parseFloat(String(root.querySelector('#sim-rate').value).replace(',', '.')) || 0);
      const name = root.querySelector('#sim-name').value.trim() || 'Item simulado';
      store.commit((s) => { s.simItems.push({ id: uid('s'), name, total, inst, rate, ...F.simulate(total, inst, rate) }); });
    },
    'del-sim': (el) => store.commit((s) => { s.simItems = s.simItems.filter((x) => x.id !== el.dataset.id); }),
    'clear-sim': () => store.commit((s) => { s.simItems = []; }),
  },
};
