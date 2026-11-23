// Nubank — conta e cartão (CSV e PDF). Aguardando exemplos reais em samples/nubank/.
import { NotImplementedYet } from '../parser.js';

const stub = (kind) => ({
  id: `nubank-${kind}`, bank: 'Nubank', kind, formats: ['csv', 'pdf'],
  detect: () => 0,
  parse: async () => { throw new NotImplementedYet('Nubank'); },
});

export default [stub('conta'), stub('cartao')];
