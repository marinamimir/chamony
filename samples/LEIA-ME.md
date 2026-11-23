# Exemplos de extrato

Os leitores de extrato só são escritos a partir de exemplos reais (não adivinhamos formatos).
**Os arquivos reais NÃO ficam aqui**: o repositório pode ser público. Eles são usados uma vez, fora do
repositório, para entender o formato; aqui ficam só **extratos falsos no mesmo formato**, gerados por
`tools/make-sample-pdfs.mjs`, e testados por `tools/test-import.mjs`.

| Banco | Tipo | Formato | Situação | Exemplo falso |
|---|---|---|---|---|
| Itaú | Conta corrente | PDF | pronto | `itau/conta.exemplo.pdf` |
| Itaú | Fatura do cartão | PDF | pronto | `itau/cartao.exemplo.pdf` |
| Itaú | Conta / cartão | CSV | aguardando exemplo | |
| Nubank | Conta | CSV | pronto | `nubank/conta.exemplo.csv` |
| Nubank | Fatura do cartão | CSV | pronto | `nubank/Nubank_2026-12-04.exemplo.csv` |

Ao mandar um exemplo real: troque nome, CPF, endereço e números de conta/cartão por texto falso do
mesmo tamanho; mantenha cabeçalhos, datas, "Parcela 2/10", estornos e pagamentos. PDF com senha:
diga só o padrão da senha, nunca a senha.
