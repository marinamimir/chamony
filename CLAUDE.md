# ChaMony

App de controle financeiro pessoal, instalável (PWA), Android primeiro.
Nome = *chamomile* + *money*. Slogan: **"Dinheiro com calma, florescendo a prosperidade."**

Este arquivo é a ficha final do projeto. Siga-a; se algo aqui for tecnicamente ruim, proponha a alternativa em vez de ignorar em silêncio.

## Ponto de partida: o AeroSync

O repositório `marinamimir/aerosync` (público) já tem um módulo de Finanças completo e o visual que o ChaMony deve herdar. **Leia, não altere.**

- Arquivo: `aerosync.html` (tudo num só arquivo). Procure por `FIN_KEY`, `loadFin`, `ensureDefaults`, `FIN_COLORS`, `FIN_ICONS`.
- Dados em localStorage: `aerosync.finances.v2` (com migração a partir de `aerosync.finances.v1`).
- Abas que existem lá: Visão Geral, Cartões (fechamento e vencimento), Compras (parcelas, PIX, edição em massa, filtros), Categorias, Salário (valor base + ajuste por mês, rendas extras), Comparativo (5 meses), Simulador, Recorrentes, Lixeira. Contas bancárias separam saldo de uso livre e reserva.
- Visual: estilo soft/Cocoon, fonte Nunito, ícones Font Awesome, variáveis CSS de tema (`--theme-accent`, `--ui-surface`, `--ui-soft-surface`, `--ui-text`), motor de temas e modo escuro.

**Portar a lógica e o visual para módulos limpos. Não copiar o HTML gigante.**
O ChaMony deve conseguir **importar os dados do AeroSync** (o JSON de `aerosync.finances.v2` e o formato do backup do AeroSync; confira como ele é gerado lá).

## Princípios

- **Privacidade total:** dados só no aparelho. Sem analytics, sem enviar dado financeiro para lugar nenhum. Extratos são processados localmente.
- **Sem framework e sem etapa de build:** HTML + CSS + JavaScript (ES modules). Hospedagem estática (GitHub Pages).
- Idioma da interface: **pt-BR**. Moeda: **somente BRL** por enquanto (use `Intl.NumberFormat`). No modelo novo, guarde valores em **centavos inteiros** e converta na migração.
- **Mobile first** (Android), alvos de toque grandes, respeitar safe areas. No desktop: menu lateral. Funciona **offline** (service worker) e é instalável.
- Cada fase termina com o app utilizável. Commits pequenos, mensagens em português.
- Schema de dados versionado (`chamony.data.v1`) com migrações. Nunca perder dados do usuário.
- Bibliotecas externas: poucas, com versão fixa e **copiadas para o repositório** (para funcionar offline).

## Identidade visual

- **Mesma vibe do AeroSync:** soft/Cocoon, cantos bem arredondados, sombras suaves, superfícies pastel. Paleta A é a padrão (acento azul-acinzentado `#7484A0`, rosa suave de fundo, cores pastel por categoria). Paleta B (amarelo-manteiga, verde-sálvia, creme) é opcional e escolhida pelo usuário.
- Tipografia: **Nunito** + uma segunda fonte refinada, tabular, para números grandes.
- Ícones: Font Awesome **ou** um conjunto próprio arredondado (usuário escolhe).
- Modo escuro: o mesmo do AeroSync. Manter o motor de temas.
- **Logo:** flor de camomila de **8 pétalas**, cores reais em tom pastel (pétalas brancas/creme, miolo amarelo-manteiga), **gradiente leve**, miolo em forma de **moeda com "R$"**. Entregar em SVG. Ícone do app Android: a flor sobre **fundo colorido** (maskable, 192 e 512).
- Abertura do app: animação da flor desabrochando (respeitar `prefers-reduced-motion`).
- Pequenas ilustrações de flores e chá nos estados vazios e nas conquistas.
- Sensação "premium": microinterações suaves, hierarquia tipográfica clara, gráficos bonitos (rosca, barras arredondadas, linhas suaves com gradiente, mantendo as cores por categoria do AeroSync), bottom sheets e gestos de app nativo.

## Experiência

- **Navegação:** no celular, barra inferior (Início, Compras, Cartões, Metas, Mais) com botão **"+" central**. No desktop, menu lateral.
- **Tela inicial:** painel completo por padrão, com opção de tela mais "respirada". Mostra: saldo livre do mês, anel do limite, próximos vencimentos, últimos gastos, comparação com o mês passado, frase de apoio. Deve servir três momentos: registrar gasto rápido, ver como está o mês, planejar.
- **Adicionar gasto:** modal atual do AeroSync por padrão; alternativa com teclado numérico grande, "+" flutuante e favoritos (gastos que se repetem).
- **Tom dos textos:** acolhedor por padrão ("respira, ainda sobram R$ X"), com opção neutro ou lúdico. Alertas sempre suaves.
- **Esconder valores** (ícone de olho). Sem PIN.

## Opções do usuário (padrão → alternativa)

| Tema | Padrão | Alternativa |
|---|---|---|
| Layout | painel completo | tela respirada |
| Adicionar gasto | modal | teclado numérico + favoritos |
| Orçamento | limite geral | limite por categoria (os dois coexistem) |
| Paleta | A (AeroSync) | B (butter/sálvia/creme) |
| Ícones | Font Awesome | conjunto próprio |
| Tom | acolhedor | neutro, lúdico |
| Esconder valores ao abrir | usuário escolhe | |
| Sons e vibração | usuário escolhe | |
| Conquistas | selos e níveis | jardim de camomilas, ou ambos |

## Funcionalidades

Tudo do AeroSync (lista acima), mais:

- Limite por categoria; fatura aberta por cartão com barra de limite (campo novo: limite do cartão).
- Metas de economia, assinaturas, dívidas e empréstimos, lista de desejos.
- Investimentos: saldo e aportes manuais, mais rentabilidade digitada pelo usuário (sem cotação automática).
- Relatório mensal em PDF, lembretes de vencimento com **notificação de verdade** (Android), foto de comprovante, notas e tags nas compras.
- Renda: salário fixo + extras.
- **Gamificação expandida:** streaks (dias registrando, dias sem gastar), metas batidas, mês no azul, fatura abaixo do limite; selos, níveis e o jardim de camomilas que floresce com os hábitos.
- Dados: locais, com **backup manual** (exportar/importar JSON) e **sincronização via arquivo** numa pasta do Drive. Documente as limitações do navegador no Android.

## Importação de extratos (prioridade alta)

- Bancos iniciais: **Itaú** e **Nubank**, conta e cartão de crédito. Formatos: CSV e PDF (leitura de PDF com pdf.js local; se o PDF tiver senha, pedir ao usuário).
- Fluxo: escolher o arquivo, ler, **sugerir categoria** (aprendendo com o que já foi categorizado), **detectar duplicados e parcelas**, e mostrar uma **tela de revisão** antes de confirmar.
- Não adivinhe os formatos. Os exemplos reais, com dados pessoais apagados, ficam em `samples/`. Se ainda não estiverem lá, peça-os antes de implementar o parser e construa a estrutura (interface de parser por banco) primeiro.

## Estrutura sugerida

```
index.html
manifest.webmanifest
sw.js
css/        tokens.css, base.css, components.css, themes.css
js/         app.js, store.js, router.js, ui/, features/, import/
icons/      logo.svg, ícones PWA
samples/    extratos anonimizados (fase 2)
```

## Fases

1. **Base:** estrutura, tokens de design e temas, logo e ícones, tela inicial, navegação, módulo de Finanças do AeroSync portado (todas as abas), importação dos dados do AeroSync, modo escuro, esconder valores, backup manual, PWA offline.
2. **Importação de extratos** do Itaú e do Nubank.
3. **Funcionalidades novas:** limites por categoria e por cartão, metas, assinaturas, dívidas, investimentos, desejos, relatório PDF, lembretes, comprovantes, notas e tags, sincronização via arquivo.
4. **Gamificação**, sons e vibração, jardim de camomilas, ilustrações.

## Como trabalhar

- Antes de codar, mostre um **plano curto** e espere aprovação.
- Termine cada tarefa dizendo o que mudou e como testar no celular.
- Em dúvida de produto, pergunte. Em dúvida técnica, decida e registre a decisão aqui neste arquivo.

## Decisões técnicas (registro)

- **Dados:** uma chave só no localStorage, `chamony.data.v1`, com campo `schema` (hoje 2; a migração 1→2 trouxe o motor de paletas e os campos das fases 3 e 4). Migrações em `js/store.js` (`MIGRATIONS[n]` leva de n para n+1) e cópia automática `chamony.data.v1.antes-schema-N` antes de migrar. Antes de importar/restaurar/apagar, o estado atual vai para `chamony.data.v1.anterior` (botão "Desfazer" e "Voltar à cópia anterior" nos Ajustes). Dados ilegíveis nunca são apagados: vão para `chamony.data.v1.ilegivel-<data>`. IndexedDB entra na fase 3 (fotos de comprovante); o acesso já é centralizado em `store.js`.
- **Valores em centavos inteiros** em todo lugar. Parcelas: divisão inteira, a sobra de centavos vai na **1ª** parcela (como os bancos fazem). Compra parcelada = várias linhas com o mesmo `groupId` (modelo do AeroSync, facilita importar extratos com "parcela 2/10").
- **Importação do AeroSync** (`js/data/aerosync.js`): aceita o backup `{ app: 'ALife'|'AeroSync', data: {...} }`, o JSON direto de `aerosync.finances.v2`/`.v1` (valores em reais → centavos) e o módulo simples `aerosync.finance` (já em centavos). Também lê direto do localStorage quando o ChaMony está na mesma origem do AeroSync (ex.: `usuario.github.io/aerosync` e `usuario.github.io/chamony`). No AeroSync o valor total original das parcelas não é guardado, então cada parcela é convertida como está.
- **Juntar dados** (`js/data/merge.js`): categorias/cartões/contas com o mesmo nome são reaproveitados; IDs que colidem ganham ID novo; compras com ID já existente são ignoradas (reimportar não duplica); compras que apontam para categoria/cartão inexistente no arquivo viram `orf-<id>` e mostram o nome guardado (`catSnap`).
- **Filtros** (categoria múltipla, pagamento, texto) são globais entre as telas; o "escopo por aba" do AeroSync foi simplificado.
- **Lembretes:** o `recurring` do AeroSync virou `bills` (contas com lembrete).
- **Limite do cartão** (`cards[].limit`) já existe no modelo e no formulário; a barra aparece no cartão quando preenchido.
- **Fontes e ícones** copiados em `vendor/` com versão fixa: Font Awesome Free 6.7.2 (só solid), Nunito e Manrope variáveis (Fontsource 5.2.5). Manrope com `tabular-nums` para números.
- **Paletas** (`js/ui/palettes.js`): cada paleta (pronta ou própria) é definida por poucas cores-base (destaque, fundo, superfície, ícones); as demais variáveis e a versão escura são derivadas com `color-mix()`. O tema é aplicado como variáveis inline no `<html>` e guardado em `chamony.theme` para o `prepaint.js` aplicar antes do primeiro desenho. Cor do texto sobre o destaque é escolhida por contraste (luminância). Fundos: `data-bg` = plain | gradient | dots | flowers.
- **Cor livre por item:** `<input type="color">` escondido dentro da amostra "Outra cor" (`colorPicks`/`bindFreeColor` em `js/ui/parts.js`).
- **Metas (hub)** em `js/features/goals.js` + `js/features/plans/*`: metas (depósitos/retiradas), desejos (viram meta, simulação ou compra), assinaturas (mensais/anuais; "Lançar" cria a compra do mês com `source: 'sub:<id>'`, sem duplicar), dívidas ("eu devo"/"me devem", pagamentos) e investimentos (aporte/retirada/rendimento; "saldo atual" vira um rendimento pela diferença). Assinaturas e dívidas com dia entram em "Próximos vencimentos".
- **Bloco C (fase 3, dia a dia):** limites por categoria em `budget.catLimits` (form da categoria; barras no Início, Resumo e Relatório). Notas, tags e foto de comprovante em "Mais detalhes" da compra; busca por texto acha nota e `#tag`; filtro por tag. Fotos comprimidas (JPEG, até 1600px) no IndexedDB (`js/data/idb.js`), apagadas quando a compra sai da lixeira; backups e arquivos de sincronização levam as fotos em base64.
- **Relatório PDF:** página `#/relatorio` com CSS de impressão; "Salvar como PDF" do próprio navegador (sem biblioteca).
- **Notificações sem servidor:** o app grava os próximos vencimentos em Cache Storage (`chamony-data/__lembretes.json`); o SW avisa uma vez por item (log em `__notificados.json`) quando o Chrome dispara `periodicsync` (~1x/dia, só com o app instalado) ou quando o app abre. Valores somem da notificação se "abrir com valores escondidos" estiver ligado.
- **Sincronização por arquivo:** "Enviar" gera `chamony-sincronizacao.json` (compartilhar → Drive); "Puxar" compara a data do arquivo com `meta.updatedAt` deste aparelho e recomenda usar o arquivo (se mais novo) ou juntar. Juntar não propaga edições/exclusões (limitação conhecida).
- **CSP** no `index.html` (`script-src 'self'`): por isso o tema inicial é aplicado por `js/prepaint.js`, não por script inline.
- **Logo:** gerado por `tools/make-logo.py` (o "R$" vira contorno a partir da Nunito, sem depender de fonte no aparelho). PNGs por `tools/make-icons.mjs` (Chromium do Playwright).
- **Service worker:** precache da lista `APP_SHELL`; navegação rede-primeiro, demais arquivos cache-primeiro com atualização em segundo plano; aviso "Nova versão · Atualizar". Ao publicar: subir `CACHE_VERSION` em `sw.js` e `APP_VERSION` em `js/version.js`; `node tools/check-sw.mjs` confere a lista.
- **Gamificação** (`js/core/game.js`): tudo calculado a partir dos dados; só a data de cada selo fica em `game.unlocked`. Sequência = dias com compra criada no app (importadas não contam; ontem vazio quebra). Nível = pontos dos selos + 2 por dia registrado. Selo novo é comemorado depois que as folhas abertas fecham (`whenIdle`); muitos de uma vez (ex.: importação) viram só um aviso. Jardim (`js/ui/garden.js`): selos = camomilas abertas, sequência = botões, metas batidas = borboletas, mês no azul = sol.
- **Sons e vibração** (`js/ui/feedback.js`): Web Audio gerado na hora (sem arquivos); só tocam depois do primeiro toque na tela (regra do navegador).
- **Teclado rápido** (`js/features/keypad.js`): favoritos fixados (estrela no formulário) + gastos que se repetem; "Mais" abre o formulário completo já preenchido.
- **Ícones próprios:** `tools/make-icons-own.mjs` gera `css/icons-own.css` (traço arredondado, aplicado por `mask` sobre o nome do ícone do Font Awesome com `<html class="icons-own">`). Ícone sem desenho próprio continua com o Font Awesome.
- **Fase 2 — extratos** (`js/import/`): `pdf.js` (pdfjs-dist 4.10.38 em `vendor/pdfjs`, carregado só na importação; `isEvalSupported: false` por causa da CSP) devolve pedaços de texto com posição; cada leitor monta linhas/colunas. Leitores prontos: Itaú conta (PDF) e Itaú fatura do cartão (PDF, 2 colunas, conferência da soma com o total impresso). `pipeline.js`: sugere categoria (histórico exato → tokens do histórico → palavras-chave → categoria do banco → "Outros", criada na hora se faltar), detecta duplicados (`imp` = chave estável por compra; parcelas sem valor na chave) e "possíveis duplicados" (mesmo valor, ±3 dias, mesma forma de pagamento, lançado à mão). Padrões combinados com a usuária: fatura e PIX para si mesma desmarcados; rendimentos entram como renda; TED/PIX recebidos desmarcados. Fatura: cada linha guarda `billYM` (mês impresso no PDF) e parcelas "N/T" criam as parcelas N..T; a próxima usa o valor de "Compras parceladas - próximas faturas". O cartão é reconhecido pelo final (`cards[].last4`); cartão novo vem com fechamento/vencimento/limite do PDF. Arquivos reais nunca vão para o repositório (só exemplos falsos em `samples/`).

## Limitações do navegador no Android (dados e backup)

- Os dados ficam no armazenamento do navegador/PWA. Limpar os dados do Chrome ou desinstalar o app **apaga tudo**: exporte backup com frequência.
- "Exportar backup" baixa um `.json` na pasta Downloads. "Enviar" usa o menu de compartilhar do Android (dá para salvar no Google Drive).
- O navegador não acessa uma pasta do Drive em segundo plano: a sincronização por arquivo é sempre manual (Enviar num aparelho, Puxar no outro).
- Notificações em segundo plano dependem do Chrome: o app precisa estar instalado e o Android decide o horário (cerca de 1x por dia; economia de bateria pode atrasar). Sem instalar, os avisos só chegam ao abrir o app.
