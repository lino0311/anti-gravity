# Precifica+ (versão HTML/CSS/JS — sem servidor)

Este é o Precifica+ reconstruído em HTML, CSS e JavaScript puros. Não precisa de
Python, Streamlit, Flask, Termux nem instalar nada — funciona abrindo um arquivo
no navegador, tanto no **computador** quanto no **celular** (Android ou iPhone).

## Como usar

1. Extraia esta pasta em qualquer lugar (computador, pendrive, ou pasta de Downloads do celular).
2. Dê duplo clique em **`index.html`** (no computador) ou abra esse arquivo pelo
   navegador do celular (Chrome, Safari etc. — no gerenciador de arquivos, toque
   em `index.html` e escolha "abrir com o navegador").
3. Pronto — o sistema abre e já pode ser usado, mesmo sem internet.

Os dados ficam salvos automaticamente **no navegador** (localStorage), no mesmo
aparelho e no mesmo navegador em que você abriu o arquivo. Não é preciso clicar em
"salvar" — cada ação já grava sozinha.

> ⚠️ Se você limpar os dados de navegação/cache do navegador, ou abrir o arquivo
> num navegador diferente, os dados não aparecem lá — por isso existe o backup
> (veja abaixo).

## Novidade: conversão de unidade na ficha técnica

Agora, ao montar a receita de um prato, você pode usar o ingrediente numa unidade
diferente da que você comprou:

- Comprou o **caranguejo em kg**, mas a receita leva **150 g**? Cadastre o
  ingrediente em kg e, na ficha técnica, informe "150" e escolha "g" — o sistema
  converte sozinho.
- Comprou o **caldo em litro**, mas usa **200 ml** na receita? Mesma lógica.
- O sistema só oferece unidades compatíveis: quem foi comprado em massa (kg/g) só
  aparece como massa na receita; quem foi comprado em volume (L/ml) só aparece
  como volume. Isso evita erro de conversão (ex: misturar kg com ml).

## Gerando o relatório em PDF

Na aba **Relatórios**, clique em "Gerar relatório (PDF/imprimir)". Isso abre a
janela de impressão do próprio navegador — escolha **"Salvar como PDF"** como
destino/impressora. Funciona igual no computador e no celular, sem instalar nada.

## Planilha Excel

Na mesma aba, "Baixar planilha (.xls)" gera um arquivo com 4 abas (Ingredientes,
Resumo de Precificação, Custos Fixos e Configurações), que abre normalmente no
Excel, Google Planilhas ou LibreOffice.

## Importação e backup (aba "Importar / Exportar")

- **Importar ingredientes em massa**: baixe o modelo `.csv`, preencha no Excel/Google
  Planilhas e suba de volta — atualiza ou cria ingredientes em lote (ex: quando o
  fornecedor reajusta os preços).
- **Backup completo**: exporta um arquivo `.json` com todos os dados (ingredientes,
  pratos, configurações, custos fixos). Use para levar seus dados para outro
  computador/celular, ou para não perder nada se limpar o navegador. Para
  restaurar, use "Restaurar backup" na mesma aba.

## O que foi testado antes da entrega

Antes de fechar esta versão, simulei o uso real da interface (clique em botões,
preenchimento de formulário, navegação entre abas) de ponta a ponta, incluindo:

- Cadastro, edição e exclusão de ingredientes (com validação de campos obrigatórios).
- Criação de prato e abertura da ficha técnica.
- Adição de ingrediente à receita **em unidade diferente da compra** (kg→g e L→ml),
  conferindo se o custo calculado bate com a conversão certa.
- Restrição das unidades oferecidas (um ingrediente em massa não pode ser
  "usado em ml", por exemplo).
- Exclusão de um ingrediente que está em uso — o sistema avisa antes e remove o
  item correspondente da ficha técnica.
- Cálculo de preço sugerido, alerta quando a soma dos percentuais estoura 100%.
- Cálculo do ponto de equilíbrio ponderado pelo mix de vendas.
- Exportação da planilha (conteúdo real presente no arquivo gerado).
- Persistência dos dados entre sessões (fechar e abrir de novo).
- Ausência de erros de JavaScript, IDs duplicados ou labels quebrados no HTML.

## Sugestões de melhorias (não incluídas nesta versão)

Como especialista em front-end, os próximos pontos que mais agregariam:

1. **Preço por porção** — hoje o custo é da ficha técnica inteira; se uma receita
   rende várias porções (ex: balde de 5 kg → 10 porções), seria bom informar o
   rendimento e ver o preço por porção automaticamente.
2. **Modo escuro** — simples de adicionar com as variáveis CSS já organizadas.
3. **Histórico de preço dos ingredientes** — gráfico simples mostrando a variação
   de custo de um ingrediente ao longo do tempo, para acompanhar inflação de insumos.
4. **Simulador de cenário** — um controle deslizante "e se eu aumentar todos os
   preços em X%?" mostrando o impacto no faturamento de equilíbrio na hora.
5. **Atalhos de teclado e busca** — campo de busca rápida na lista de ingredientes
   e pratos quando o cardápio crescer muito.
6. **Instalar como app (PWA)** — adicionando um manifest.json e service worker,
   o Precifica+ passaria a poder ser "instalado" na tela inicial do celular como
   se fosse um aplicativo nativo, com ícone próprio (hoje já funciona offline,
   só falta esse último polimento).
7. **Múltiplos cardápios/unidades** — caso você tenha mais de uma loja/unidade,
   permitir alternar entre "perfis" de dados diferentes dentro do mesmo arquivo.

Se quiser, posso implementar qualquer um desses agora.
