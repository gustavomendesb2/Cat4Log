# Redesign Visual — Galeria Editorial Premium

**Data:** 2026-06-16
**Status:** Aprovado (design)

## Objetivo

Repaginar o visual do cat4log para uma estética **galeria editorial premium**: dark
sofisticado, monocromático com um único acento esmeralda, tipografia editorial e
microinterações refinadas. As imagens da coleção continuam sendo o centro — o cromo
não compete com elas.

## Restrições

- **Estrutura inalterada.** Nenhuma rota, fluxo, estado ou contrato de dados muda.
- Mudanças são **apenas visuais**: design tokens + classes Tailwind + motion.
- Cada passo é independente e reversível.
- Sem novas dependências (framer-motion, lucide e tailwind já estão no projeto).

## Decisões de identidade

- **Direção:** galeria editorial premium (eleva o dark minimal atual, não troca de paradigma).
- **Cor:** monocromático + 1 acento.
- **Acento:** esmeralda (`~#34d399` foco/hover, `~#10b981` cheio), usado em progresso,
  ações primárias, foco e no estado "preenchido".
- **Wordmark:** "Studio" → **"cat4log"** (TopNavBar e título do LoginScreen).

## 1. Fundação — token-first

Reescrever a camada de tokens primeiro; ~70% do impacto se propaga aos componentes.

- **Rampa de neutros:** expandir de 3 cinzas para ~6 níveis de superfície/borda para
  criar profundidade e camadas reais. Definidos em `src/styles/tokens.css` e espelhados
  em `tailwind.config.js`.
- **Token de acento:** `--accent` (foco/hover) e `--accent-strong` (cheio), expostos no
  tema Tailwind como `accent`.
- **Tipografia:** Playfair Display com mais protagonismo (títulos maiores, tracking
  apertado). Números dos cards (001, 002…) tratados como label editorial com
  letter-spacing. Inter permanece na UI.
- **Elevação & luz:** sombras suaves em camadas; ring sutil no hover. Grão de fundo
  quase imperceptível no `body` (overlay leve) para o toque de galeria.
- **Foco/acessibilidade:** `focus-visible` com ring esmeralda em elementos interativos;
  respeitar `prefers-reduced-motion` (desativar zoom/stagger).

Arquivos: `src/styles/tokens.css`, `tailwind.config.js`, `src/index.css`.

## 2. Cards (`Card.tsx`, `CollectionGrid.tsx`, `Skeleton.tsx`)

- **Estado vazio:** número grande em Playfair como peça de galeria; placeholder elegante.
- **Hover:** zoom suave + ring esmeralda + legenda que sobe com scrim gradiente
  (substitui o badge preto fixo).
- **Status "preenchido":** marca esmeralda discreta (canto/borda) para conectar o acento
  ao propósito de colecionar.
- **Grid:** entrada em stagger (motion); skeleton com shimmer em gradiente (não `pulse`).

## 3. Cromo & telas

- **TopNavBar:** wordmark "cat4log" refinado; tab ativa com sublinhado esmeralda; campo
  de busca mais elegante.
- **ProgressBar:** fill esmeralda, exibe `%`, transição suave.
- **StyleTabs + filtros (em `CollectionPage.tsx`):** pills consistentes; ativo em esmeralda.
- **CardModal:** mais premium — em telas largas, imagem maior com metadados ao lado;
  inputs e botões refinados; ação primária esmeralda; focus rings.
- **LoginScreen:** layout editorial centrado; título "cat4log"; inputs refinados.

## 4. Movimento (framer-motion)

- Entrada do grid em stagger; transições de layout; modal com spring; micro-interações
  no hover. Tudo condicionado a `prefers-reduced-motion`.

## Ordem de execução

1. Tokens (fundação)
2. Card + Grid + Skeleton
3. TopNav + ProgressBar + StyleTabs + filtros
4. CardModal
5. LoginScreen
6. Polimento de motion / passada final de consistência

## Critérios de sucesso

- Visual claramente elevado vs. o atual, mantendo legibilidade e foco nas imagens.
- Acento esmeralda aplicado de forma coesa (progresso, primário, foco, "preenchido").
- Wordmark "cat4log" nos dois pontos.
- Zero regressão funcional: rotas, upload, filtros, export CSV e auth seguem idênticos.
- `prefers-reduced-motion` respeitado.
- `npm run build` e `npm run lint` passam.
