# Minimalist Collection Studio — Design / Spec

**Data:** 2026-06-14
**Autor:** Gustavo Mendes
**Status:** Aprovado para implementação (base: backend + banco + front funcional)

## 1. Visão geral

Studio pessoal de gerenciamento de coleções de arte (imagens geradas no
nanobanana). Uso individual, na nuvem, instalável como PWA no celular. A
estética segue o "Minimalist Studio Design System" (dark, alto contraste,
grid-based, a arte é o foco).

Esta spec cobre **a base**: backend com banco de dados, storage de imagens,
autenticação e o front-end funcional. Refinamentos visuais (ex: ajuste fino de
proporções e animações) acontecem depois sobre essa base.

## 2. Stack

- **Front:** React 19 + Vite + TypeScript (já existente no repo).
- **Estilo:** Tailwind CSS, com o design system exposto via CSS variables.
- **Animações:** Framer Motion (stagger no grid, fade entre coleções).
- **Ícones:** Lucide React.
- **Rotas:** React Router (`/pokemon`, `/naruto`).
- **PWA:** `vite-plugin-pwa` (manifest + service worker, app shell cacheado).
- **Backend (serverless):** Supabase — Postgres + Storage + Auth.
- **Hospedagem:** Vercel (já conectado ao repositório).

### Princípio de arquitetura

Todo acesso ao Supabase fica atrás de um **módulo de repositório**
(`src/lib/catalog/`): `listCollections()`, `listCards()`, `createCard()`,
`uploadCardImage()`, `updateCard()`, `deleteCard()`, etc. Os componentes nunca
falam direto com o Supabase. Isso isola banco e storage, tornando trivial uma
futura troca de storage (Supabase → Cloudflare R2) sem tocar na UI.

## 3. Decisão de backend (banco gratuito)

**Escolhido: Supabase puro (Opção A).** Resolve banco + storage + auth num
serviço só, free tier suficiente para o início, ótimo SDK React.

- Postgres free: 500 MB (cabe dezenas de milhares de cards — só texto).
- Storage free: 1 GB + 5 GB transferência/mês.
- Auth free: usuário único.

**Caminho de evolução:** se o storage de 1 GB apertar, migrar as imagens para
**Cloudflare R2** (10 GB grátis, sem custo de transferência) reescrevendo apenas
o módulo de storage. Volume final ainda indefinido, por isso a camada isolada.

## 4. Modelo de dados (Postgres)

```
collections
  id          uuid pk default gen_random_uuid()
  slug        text unique        -- "pokemon", "naruto"
  name        text               -- "Pokémon", "Naruto"
  sort_order  int
  created_at  timestamptz default now()

cards
  id            uuid pk default gen_random_uuid()
  collection_id uuid fk -> collections(id) on delete cascade
  number        text               -- "006" (texto: preserva zero à esquerda)
  name          text               -- "Charizard"
  image_path    text null          -- caminho no storage; null = card vazio
  aspect_ratio  text default '3:4' -- "1:1" | "9:16" | "3:4"
  tags          text[] default '{}'
  status        text default 'empty' -- "empty" | "filled" (derivado de image_path)
  sort_order    int
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
```

Decisões:
- `number` como **texto** preserva "001", "006", "025".
- `image_path = null` ⇒ card vazio (placeholder com número + nome).
- `status` redundante com `image_path`, mantido para filtro rápido; atualizado
  por trigger ou pela função de repositório no upload/remoção de imagem.
- `aspect_ratio` por card. Default da tabela = `3:4`.
- Tabela `tags` dedicada fica para fase 2; começamos com `text[]` em `cards`.

### Seed inicial

- Migration insere as 2 coleções: `pokemon` e `naruto`.
- Insere os **151 Pokémon originais** (número + nome corretos), todos com
  `image_path = null`, `status = 'empty'` e **`aspect_ratio = '9:16'`**.
- `naruto` nasce **vazia** (sem cards).

## 5. Storage de imagens

- Bucket Supabase **`card-images`**, **público** (leitura via CDN; carregamento
  rápido). Escrita/gerência exige sessão autenticada.
- `uploadCardImage(cardId, file)`: faz upload, grava `image_path`, marca card
  como `filled`. A UI pede a URL pública ao repositório; nunca monta URL na mão.
- **Otimização no cliente antes do upload:** redimensiona (máx ~1600px no maior
  lado) e converte para WebP, com **toggle para desligar** (qualidade máxima).
  Reduz drasticamente o consumo do free tier.
- Troca futura para R2 = reescrever só o módulo de storage.

## 6. Autenticação e segurança

- Supabase Auth com **usuário único** (email do dono). Tela de login simples.
- **Row Level Security (RLS)** em `collections` e `cards`: apenas o usuário
  autenticado lê/escreve. Mesmo com a URL pública do app, ninguém acessa os
  dados sem login.
- Imagens são públicas por URL (decisão do dono); o catálogo e toda edição
  permanecem protegidos por login + RLS.

## 7. Front-end

### Rotas / telas
```
TopNavBar (fixa): Logo "Studio" · links Pokémon/Naruto (underline ativo) · busca · botão +
/pokemon → CollectionGrid (151 cards, vazios e preenchidos)
/naruto  → CollectionGrid (começa vazia)
Modal "+"     → AddFlow (manual e CSV)
Modal do card → ver grande / upload / editar tags e proporção
```

### Componentes-núcleo
- **`CollectionGrid`** — grid fluido (4–6 colunas no desktop, margens de 40px),
  adapta-se às proporções dos cards, entrada com stagger (Framer Motion),
  skeletons durante o loading.
- **`Card`** — imagem ou placeholder elegante (card vazio com visual distinto e
  sutil). Label flutuante embaixo à esquerda, fundo preto translúcido:
  `"006 Charizard"`. Hover: leve scale-up + aumento de brilho.
- **`CardModal`** — card vazio mostra dropzone de upload; preenchido mostra
  imagem grande e permite trocar imagem, editar tags e proporção
  (1:1 / 9:16 / 3:4).
- **`AddFlow`** — adiciona cards a **qualquer coleção, a qualquer momento**
  (não só na criação):
  - **Manual:** formulário (número, nome, tags, proporção; imagem opcional).
  - **CSV import:** dropzone `.csv` → preview do grid parseado → confirmar.
  - Cards podem ser criados **vazios** (placeholder; imagem depois) ou já com
    imagem.

### Design system (CSS variables)
```
--surface:#131313  --surface-dim:#0e0e0e  --surface-bright:#3a3939
--on-surface:#FFFFFF  --on-surface-variant:#A1A1A1
radius: 4px · títulos: Playfair Display · UI: Inter · backdrop modal: rgba(0,0,0,0.85)
```
Abordagem "whitespace first": não lotar os cards.

### PWA
`vite-plugin-pwa`: manifest (nome "Studio", tema dark, ícones) + service worker
cacheando o app shell. Instalável no celular.

## 8. Escopo de fases

**Fase 1 (esta base):**
- Backend Supabase (banco + storage + auth + RLS) e seed dos 151 Pokémon.
- Módulo de repositório isolado.
- TopNavBar, CollectionGrid, Card, CardModal, AddFlow (manual + CSV, em coleção
  existente também), upload com otimização no cliente.
- Design system aplicado, animações (stagger + fade entre coleções), PWA.
- Barra de progresso da coleção ("48/151 preenchidos").
- Filtro vazios/preenchidos + busca (nome/número/tag).
- Skeletons de loading.
- Modos de densidade de visualização.
- Exportar coleção.

**Fase 2 (depois):**
- Reordenar cards por drag-and-drop.
- Tabela `tags` dedicada.
- Ajustes finos de proporção/animação e outras melhorias.

## 9. Riscos / pontos de atenção

- **Limite de 1 GB de storage:** mitigado pela otimização no cliente; plano de
  migração para R2 já previsto.
- **CSV import:** definir o formato de colunas esperado (ex:
  `number,name,tags`) e tratamento de erros de parsing no preview.
- **Variáveis de ambiente** do Supabase configuradas na Vercel (URL + anon key).
