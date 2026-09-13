# Precifica+ 🦀

> Sistema inteligente e gratuito de precificação de cardápio, ficha técnica e ponto de equilíbrio. 100% local no navegador, rápido e sem dependência de banco de dados no servidor.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lino0311/anti-gravity)

---

## 🚀 Publicação e Deploy na Vercel

O projeto agora está com arquitetura **Zero-Config** para deploy instantâneo na **Vercel**:

### Opção 1: Via Painel Web da Vercel (Recomendado)
1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta do GitHub.
2. Clique em **"Add New..."** → **"Project"**.
3. Selecione o repositório **`anti-gravity`** (ou `Precifica+`).
4. **Não altere nada** no "Root Directory" (deixe `./`).
5. Clique em **"Deploy"**.
6. Pronto! Em segundos seu link de produção (`https://precifica-plus.vercel.app`) estará no ar. Cada novo `git push` na branch `main` atualizará a versão de produção automaticamente.

### Opção 2: Via Terminal (Vercel CLI)
Se preferir publicar diretamente pelo terminal:
```bash
# 1. Login na Vercel
npx vercel login

# 2. Deploy de prévia
npx vercel

# 3. Deploy de produção
npx vercel --prod
```

---

## 📁 Estrutura do Projeto

```text
├── index.html       # Estrutura principal da aplicação
├── style.css        # Folha de estilos responsiva
├── app.js           # Lógica da interface, tabelas e persistência (localStorage)
├── calc.js          # Motor matemático de cálculos e conversões
├── vercel.json      # Configurações de rotas, clean URLs e headers de segurança na Vercel
├── package.json     # Metadados e scripts locais
├── .gitignore       # Bloqueio de arquivos locais e temporários
└── README.md        # Guia do sistema
```

---

## 💻 Desenvolvimento Local

Para testar localmente, basta abrir o `index.html` em qualquer navegador ou executar:

```bash
npm run dev
# ou
npx serve .
```

---

## 🛠️ Principais Funcionalidades

- **Ficha Técnica Automatizada**: Cálculo de CMV por ingrediente e prato.
- **Conversão Automática de Unidades**: Cadastre em kg ou L e utilize na receita em g ou ml — conversão sem erros.
- **Ponto de Equilíbrio**: Ponderado pelo mix de faturamento e custos fixos.
- **Payback Descontado**: Simulação de retorno de investimento.
- **Relatórios**: Impressão e exportação para PDF nativo e planilha `.xls`.
- **Backup & Restauração**: Exportação/Importação completa em formato `.json` ou lote em `.csv`.
