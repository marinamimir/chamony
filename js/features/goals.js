// Metas — chega na fase 3 (metas de economia, assinaturas, dívidas, investimentos, desejos).
import { emptyState } from '../ui/illustrations.js';

export default {
  id: 'metas',
  title: 'Metas',
  render() {
    return `<div class="card">${emptyState('garden', 'Seu jardim de metas está sendo plantado',
      'Em breve: metas de economia, assinaturas, dívidas, investimentos e lista de desejos. Enquanto isso, o Simulador ajuda a planejar compras.',
      '<a class="btn primary" href="#/simulador"><i class="fas fa-calculator"></i>Abrir o Simulador</a>')}</div>`;
  },
};
