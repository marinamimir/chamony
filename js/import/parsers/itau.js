// Itaú — conta e cartão (CSV e PDF). Aguardando exemplos reais em samples/itau/.
import { NotImplementedYet } from '../parser.js';

const stub = (kind) => ({
  id: `itau-${kind}`, bank: 'Itaú', kind, formats: ['csv', 'pdf'],
  detect: () => 0,
  parse: async () => { throw new NotImplementedYet('Itaú'); },
});

export default [stub('conta'), stub('cartao')];
