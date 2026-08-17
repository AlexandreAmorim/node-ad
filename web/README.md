# Painel de Gestão Correcional

Protótipo do painel de gestão correcional, portado do HTML de arquivo único (bundle esbuild + React 18 com estilos inline) para um projeto React 19 + Vite + Tailwind CSS v4 em TypeScript.

> Dados fictícios. Nenhuma informação real de servidor ou processo.

## Stack

| Camada | Escolha |
| --- | --- |
| Runtime UI | React 19 |
| Build | Vite 7 |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`, sem `tailwind.config.js`) |
| Gráficos | Recharts 3 |
| Tipagem | TypeScript strict, alias `@/*` → `src/*` |

## Rodando

```bash
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # tsc -b && vite build
npm run preview   # serve o dist/
npm run typecheck # apenas checagem de tipos
```

## Estrutura

```
src/
├── main.tsx                  # createRoot + StrictMode
├── App.tsx                   # shell, cabeçalho e navegação por abas
├── index.css                 # @theme do Tailwind (design tokens) + base
├── types.ts                  # tipos do domínio correcional
├── data/                     # dataset do protótipo (substituir por API)
│   ├── procedimentos.ts      # + DATA_REFERENCIA
│   ├── documentos.ts
│   ├── fichas.ts
│   └── grafo.ts
├── lib/
│   ├── prazos.ts             # dias, semáforo, formatação, siglas
│   ├── severidade.ts         # severidade → classes Tailwind
│   └── tokens.ts             # hex dos tokens (Recharts/SVG recebem cor por prop)
├── components/               # Badge, Card, Kpi, Section
└── features/
    ├── visao-geral/          # KPIs, radar de prescrição, gráficos
    ├── prazos/               # tabela filtrável
    ├── vinculos/             # mapa SVG + painel lateral
    └── mesa/                 # fila, ficha do caso, ficha do documento
```

## O que mudou em relação ao HTML original

- **Estilos inline → Tailwind.** A paleta (`ink`, `paper`, `danger`, `warn`, `ok`, `nexus`…) e as três famílias tipográficas viraram tokens no bloco `@theme` do `index.css`, disponíveis como utilitários (`bg-ink`, `text-warn`, `font-display`). O visual é o mesmo.
- **Fontes** saíram de um `@import` dentro de `<style>` e foram para `<link rel="preconnect">` + stylesheet no `index.html`, o que evita o request em cascata.
- **`React.createElement` → JSX**, com os componentes separados por feature em vez de um arquivo único.
- **Tipagem do domínio** em `types.ts`; `PROCEDIMENTOS`, `FICHAS`, `DOCUMENTOS` e o grafo são tipados e ficam isolados em `data/`.
- **Acessibilidade:** botões reais com `type="button"`, `aria-current` nas abas, nós do grafo focáveis por teclado, `:focus-visible` visível e `prefers-reduced-motion` respeitado.
- **Responsividade:** os grids que eram fixos (`1fr 320px`, `300px 1fr`, `1fr 1fr`) empilham abaixo de `lg`/`md`.

## Integração com a API

O painel consome a API Fastify do projeto `node-ad`. Configure a URL em `.env`:

```
VITE_API_URL=http://localhost:3000
```

Autenticação é pelo Active Directory (`POST /auth/login`); o JWT de 8h fica em
`sessionStorage` e todo 401 derruba a sessão automaticamente.

### Estado de cada aba

| Aba | Fonte |
| --- | --- |
| Visão Geral | API (`GET /processos`) |
| Prazos | API — colunas de prazo/prescrição aparecem como "sem controle" |
| Vínculos | **dados fictícios do protótipo** (a API não persiste vínculos) |
| Mesa do Corregedor | API (`GET /processos/:id` + `/andamentos`) |

### O que falta no backend

- `prazoFim`, `prescricaoEm` e `fase` no model `Processo`
- tabela de partes (o `seiSync` já pede `Interessados` ao SEI e descarta)
- tabela de processos relacionados (`SinRetornarProcedimentosRelacionados` nem é pedido)

Enquanto isso, `src/data/` mantém os datasets do protótipo, usados só pela aba Vínculos.
