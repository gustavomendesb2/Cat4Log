# Subcollections, Custom Collections & Add Improvements — Design / Spec

**Data:** 2026-06-15
**Autor:** Gustavo Mendes
**Status:** Aprovado para implementação
**Extende:** [2026-06-14-collection-studio-design.md](2026-06-14-collection-studio-design.md)

## 1. Visão geral

Quatro mudanças sobre a base já implementada:

1. **Coleções customizadas** — criar coleções além de Pokémon/Naruto pela UI.
2. **Subcoleções ("estilos")** — cada coleção tem ≥1 estilo; cards pertencem a um
   estilo; a view "geral" da coleção agrega todos os estilos.
3. **Autonumeração** — ao adicionar card sem número, usa o próximo disponível no
   estilo de destino.
4. **Proporção no import CSV** — escolher a proporção aplicada a todos os cards do
   import.

## 2. Modelo de dados

Nova tabela `subcollections`; `cards` passa a referenciar um estilo.

```
collections                       (inalterada)
  id uuid pk, slug text unique, name text, sort_order int, created_at

subcollections                    (NOVA)
  id            uuid pk default gen_random_uuid()
  collection_id uuid fk -> collections(id) on delete cascade
  slug          text not null          -- "padrao", "estilo-a"
  name          text not null          -- "Padrão", "Estilo A"
  sort_order    int  not null default 0
  created_at    timestamptz default now()
  unique(collection_id, slug)

cards
  subcollection_id uuid fk -> subcollections(id) on delete cascade   (NOVO)
  collection_id    uuid fk -> collections(id) on delete cascade      (mantido, denormalizado)
  number, name, image_path, aspect_ratio, tags, status, sort_order, created_at, updated_at  (inalterados)
```

**Regras:**
- Toda coleção tem ≥1 estilo. Coleção nova cria um estilo `padrao` ("Padrão")
  automaticamente.
- Card sempre vive num estilo. `cards.collection_id` é preenchido a partir do
  estilo no insert (pela camada de repositório), permitindo a view "geral" sem
  join.
- RLS das novas tabelas segue o padrão existente: leitura/escrita só para
  usuário autenticado.

### Migração (2ª migration SQL — `0002_subcollections.sql`)

1. Cria `subcollections` + RLS.
2. Adiciona `cards.subcollection_id` (nullable inicialmente).
3. Para cada coleção existente, cria um estilo `padrao`.
4. Atribui todos os cards existentes ao estilo `padrao` da sua coleção
   (`update cards set subcollection_id = <padrao da collection_id>`).
5. Torna `cards.subcollection_id` NOT NULL.

## 3. Navegação e rotas

```
TopNavBar
  Logo "Studio" · abas de coleções (dinâmicas) · "＋ Nova coleção" · busca · botão + (add card)

Rotas:
  /:collection          → view GERAL (agrega todos os estilos)
  /:collection/:style   → view de UM estilo

Faixa de estilos (só renderiza se a coleção tem >1 estilo):
  [ Geral ] [ Padrão ] [ Estilo A ] ... [ + estilo ]
```

**Comportamento:**
- Coleção com 1 estilo → sem faixa de estilos (parece coleção simples).
- Aba **Geral** = união de todos os estilos. Progresso/filtros/busca operam sobre
  o conjunto visível.
- Aba de estilo = só os cards daquele estilo.
- Coleções vêm de `listCollections()`; abas refletem a lista (inclui as novas).

**Gerenciar:**
- "＋ Nova coleção" → modal: nome → gera slug → cria coleção + estilo "Padrão".
- "+ estilo" → modal: nome → gera slug → cria estilo na coleção atual.
- Renomear estilo → ícone de edição na aba ativa (atualiza `name`; slug fica).
- Excluir coleção/estilo: fora de escopo (destrutivo, raro). Deferido.

## 4. Fluxo de adicionar card

`AddFlow` passa a ter um **estilo de destino**:
- Aberto numa aba de estilo → destino é aquele estilo (seletor oculto/preenchido).
- Aberto na aba Geral ou coleção recém-criada → mostra seletor "Adicionar em qual
  estilo?" (lista os estilos da coleção; default = primeiro).
- `createCards` passa a receber `subcollectionId` (não mais `collectionId`); o
  repositório resolve e grava o `collection_id` correspondente.

### Autonumeração

Helper puro `nextNumber(existingNumbers: string[]): string`:
- Considera apenas entradas numéricas; pega o maior inteiro; soma 1; formata com
  `padStart(3,'0')` (mínimo 3 dígitos; números ≥1000 mantêm seu tamanho).
- Lista vazia → "001".

Uso:
- **Manual:** número vazio → `nextNumber(numbersDoEstilo)`. Número informado →
  usado como está.
- **CSV:** linhas sem número recebem números sequenciais começando do próximo
  disponível, sem colidir entre si nem com os existentes. O parser marca número
  ausente como vazio; a atribuição sequencial ocorre na confirmação do import,
  conhecendo o estilo de destino.

### Proporção no CSV

- Tela de import CSV ganha seletor de proporção (1:1 / 9:16 / 3:4), default
  **9:16**, aplicado a todos os cards do import (sobrescreve o `aspectRatio` que o
  parser devolve).

## 5. Camada de código (mudanças)

**Tipos (`types.ts`):**
- Novo `Subcollection { id, collectionId, slug, name, sortOrder }`.
- `Card` ganha `subcollectionId: string`.
- `NewCard.number` passa a ser opcional (`number?: string`) — vazio dispara
  autonumeração.

**Repositório (`repository.ts`):**
- `listSubcollections(collectionId): Subcollection[]`
- `createCollection(name): Collection` (cria coleção + estilo "Padrão"; gera slug)
- `createSubcollection(collectionId, name): Subcollection` (gera slug)
- `renameSubcollection(id, name)`
- `listCards(scope)` aceita escopo por coleção (geral) ou por estilo:
  `listCardsByCollection(collectionId)` e `listCardsBySubcollection(subId)`.
- `createCards(subcollectionId, cards)` — resolve `collection_id`, aplica
  autonumeração para números vazios.

**Helpers puros (`derive.ts` ou novo `numbering.ts`):**
- `nextNumber(existing: string[]): string`
- `slugify(name: string): string`

**Componentes:**
- `TopNavBar` — abas dinâmicas de coleções + "Nova coleção".
- Novo `StyleTabs` — faixa Geral/estilos + "+ estilo" + renomear.
- Novo `NewCollectionModal` e `NewStyleModal` (ou um modal genérico de nome).
- `AddFlow` — seletor de estilo de destino + proporção no CSV.
- `CollectionPage` — lê `:collection` e `:style` opcional; decide escopo
  (geral vs estilo); carrega estilos; renderiza `StyleTabs` quando >1.

## 6. Testes

- `nextNumber`: vazio→"001"; ["001".."151"]→"152"; ignora não-numéricos;
  mistura com gaps pega max+1.
- `slugify`: acentos/maiúsculas/espaços → slug kebab-case ascii.
- CSV import com proporção e números vazios: atribuição sequencial sem colisão
  (testado no helper de atribuição).

## 7. Riscos / atenção

- **Migração de dados:** a migration deve ser idempotente o suficiente para rodar
  uma vez; após ela, `subcollection_id` é NOT NULL. Validar contagem de cards
  pós-migração (151 no estilo Padrão de Pokémon).
- **Slugs duplicados:** `slugify` + checagem de unicidade por coleção; se colidir,
  sufixa `-2`, `-3`.
- **View Geral com números repetidos:** esperado (cada estilo tem seu 006). Não é
  erro; a chave de render é o `id` do card.
