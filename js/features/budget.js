// Limite geral do mês (o anel da tela inicial).
import * as store from '../store.js';
import { attachMoneyMask } from '../core/money.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

export function openLimitSheet() {
  const d = store.get();
  openSheet({
    title: 'Limite do mês',
    body: `<p class="small muted mb-3">Quanto você quer gastar, no máximo, por mês (somando cartões e Pix)? Use 0 para desligar o anel.</p>
      <label class="field"><span>Limite mensal</span><input class="input money" id="lim-val" autofocus></label>`,
    foot: '<button type="button" class="btn primary block" data-save>Salvar limite</button>',
    onMount(el, api) {
      const money = attachMoneyMask(el.querySelector('#lim-val'), d.budget.monthlyLimit);
      el.querySelector('[data-save]').addEventListener('click', () => {
        store.commit((s) => { s.budget.monthlyLimit = money.get(); });
        api.close();
        toast(money.get() ? 'Limite salvo' : 'Anel de limite desligado');
      });
    },
  });
}
