// Gera extratos FALSOS do Itaú (dados inventados) no mesmo formato dos reais, para testar os leitores
// sem guardar dados pessoais no repositório. Saída: samples/itau/*.exemplo.pdf
// Uso: NODE_PATH=$(npm root -g) node tools/make-sample-pdfs.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'samples', 'itau');
mkdirSync(out, { recursive: true });

const css = `body{font-family:Arial,sans-serif;font-size:9pt;margin:0;padding:28px 40px;color:#111}
table{width:100%;border-collapse:collapse;margin-bottom:10px}td,th{text-align:left;padding:5px 4px;vertical-align:top;border-bottom:1px solid #ddd}
th{font-weight:700}.v{text-align:right;width:90px}.s{text-align:right;width:90px}h2{font-size:15pt;margin:18px 0 6px}h3{font-size:12pt;margin:12px 0 4px}
.cols{display:flex;gap:40px}.col{flex:1}.page{page-break-after:always}.d{width:72px;white-space:nowrap}.desc{width:150px}`;

const conta = `<html><head><style>${css}</style></head><body>
<p style="text-align:right">FULANA DE TAL EXEMPLO<br>CPF: 000.000.000-00 agência: 0000 conta: 00000-0</p>
<p>Saldo em conta<br>R$ 1.000,00</p>
<h2>Extrato conta corrente</h2>
<p>Período de visualização: 01/10/2026 até 30/11/2026 &nbsp;&nbsp;&nbsp; Emitido em: 30/11/2026 10:00:00</p>
<h2>Lançamentos futuros</h2><h3>Saídas futuras</h3>
<table><tr><th class="d">Data</th><th>Lançamentos</th><th class="desc">Descrição</th><th class="v">Valor (R$)</th><th class="s">Saldo (R$)</th></tr>
<tr><td>05/12/2026</td><td>DÉBITO AUTOMÁTICO</td><td>FATURA ITAU EXEMPLO</td><td class="v">-1.234,56</td><td class="s"></td></tr></table>
<h2>Lançamentos</h2>
<table><tr><th class="d">Data</th><th>Lançamentos</th><th class="desc">Descrição</th><th class="v">Valor (R$)</th><th class="s">Saldo (R$)</th></tr>
<tr><td>28/11/2026</td><td></td><td></td><td class="v"></td><td class="s">1.000,00</td></tr>
<tr><td>28/11/2026</td><td>RENDIMENTOS</td><td>REND PAGO APLIC AUT MAIS</td><td class="v">0,12</td><td class="s"></td></tr>
<tr><td>27/11/2026</td><td>PIX ENVIADO</td><td>JOAO DA SILVA EXEMPLO DE NOME COMPRIDO</td><td class="v">-150,00</td><td class="s"></td></tr>
<tr><td>26/11/2026</td><td>PIX ENVIADO</td><td>FULANA DE TAL EXEMPLO</td><td class="v">-500,00</td><td class="s"></td></tr>
<tr><td>20/11/2026</td><td>COMPRA DÉBITO</td><td>PADARIA EXEMPLO</td><td class="v">-18,50</td><td class="s"></td></tr>
<tr><td>15/11/2026</td><td>PAGAMENTO DE BOLETO</td><td>COMPANHIA DE ENERGIA EXEMPLO DISTRIBUIDORA</td><td class="v">-210,33</td><td class="s"></td></tr>
<tr><td>10/11/2026</td><td>TED RECEBIDA</td><td>EMPRESA EXEMPLO LTDA</td><td class="v">5.000,00</td><td class="s"></td></tr>
<tr><td>05/11/2026</td><td>DÉBITO AUTOMÁTICO</td><td>FATURA ITAU EXEMPLO</td><td class="v">-980,10</td><td class="s"></td></tr>
<tr><td>04/11/2026</td><td>PAGAMENTO DE TARIFA</td><td>TAR PACOTE ITAU OUT/26</td><td class="v">-28,00</td><td class="s"></td></tr>
</table>
<h2>Posição consolidada</h2><p>saldo total disponível R$ 1.000,00</p>
<p>Consultas e serviços no site do Itaú.</p></body></html>`;

const buy = (d, desc, v, cat) => `<tr><td class="d">${d}</td><td>${desc}<br>${cat}</td><td class="v">${v}</td></tr>`;
const head = '<tr><th class="d">DATA</th><th>ESTABELECIMENTO</th><th class="v">VALOR EM R$</th></tr>';
const cartao = `<html><head><style>${css}</style></head><body>
<div class="page">
<p>FULANA DE TAL EXEMPLO<br>RUA DO EXEMPLO, 1</p>
<p>Resumo da fatura em R$<br>Lançamentos atuais 1.000,00<br>Total desta fatura 1.000,00</p>
<p>Postagem: 18/11/2026<br>Vencimento: 25/11/2026<br>Emissão: 18/11/2026<br>Previsão próx. Fechamento: 18/12/2026</p>
<p>Titular FULANA DE TAL EXEMPLO<br>Cartão 1111.XXXX.XXXX.4321</p>
<p>Limite total de crédito: R$ 10.000,00</p>
</div>
<div class="page cols">
<div class="col">
<h3>Pagamentos efetuados</h3><table><tr><th class="d">DATA</th><th>VALOR EM R$</th><th></th></tr><tr><td>26/10</td><td>PAGAMENTO DEB AUTOMATIC</td><td class="v">-500,00</td></tr></table>
<h3>Lançamentos: compras e saques</h3><table>${head}
${buy('14/10', 'LOJA EXEMPLO 02/10', '100,00', 'vestuário SAO PAULO')}
${buy('30/10', 'DL *UberRidesS', '25,50', 'transporte Sao Paulo')}
${buy('01/11', 'MERCADO EXEMPLO', '300,00', 'supermercado PORTO ALEGRE')}
</table></div>
<div class="col">
<h3>Lançamentos: compras e saques</h3><table>${head}
${buy('05/11', '99Food *Restaurante Exe', '80,00', 'restaurante Porto Alegre')}
${buy('10/11', 'SHOPEE *EXEMPLO 01/03', '60,00', 'outros SAO PAULO')}
${buy('15/11', 'FARMACIA EXEMPLO', '74,50', 'saúde PORTO ALEGRE')}
</table>
<p>Lançamentos no cartão 640,00</p></div>
</div>
<div class="cols">
<div class="col">
<h3>Lançamentos internacionais</h3><table><tr><th class="d">DATA ESTABELECIMENTO</th><th>US$</th><th class="v">R$</th></tr>
<tr><td colspan="2">22/10 Loja.com*Exemplo</td><td class="v">340,00</td></tr><tr><td></td><td>60,00 BRL 10,00</td><td></td></tr></table>
<p>Total transações inter. em R$ 340,00</p><p>Repasse de IOF em R$ 20,00</p><p>Total lançamentos inter. em R$ 360,00</p>
<p>Total dos lançamentos atuais 1.000,00</p>
<h3>Compras parceladas - próximas faturas</h3><table>${head}
<tr><td>14/10</td><td>LOJA EXEMPLO 03/10</td><td class="v">100,00</td></tr>
<tr><td>10/11</td><td>SHOPEE *EXEMPLO 02/03</td><td class="v">59,99</td></tr></table>
</div>
<div class="col"><h3>Limites de crédito</h3><p>Limite total de crédito 10.000,00</p></div>
</div></body></html>`;

const b = await chromium.launch();
const p = await b.newPage();
for (const [name, html] of [['conta.exemplo.pdf', conta], ['cartao.exemplo.pdf', cartao]]) {
  await p.setContent(html);
  await p.pdf({ path: path.join(out, name), format: 'A4', printBackground: true });
  console.log('gerado', `samples/itau/${name}`);
}
await b.close();
