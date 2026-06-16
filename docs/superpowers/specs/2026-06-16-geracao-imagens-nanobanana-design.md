# Geração de imagens via nanobanana (Google Gemini)

Data: 2026-06-16
Status: aprovado para implementação

## Objetivo

Permitir gerar imagens de cards diretamente no cat4Log usando a API de imagem do
Google (nanobanana / Gemini). Cada subcoleção ("estilo") tem um **prompt template**
com uma parte variável `{personagem}`. O usuário digita o personagem, o app monta o
prompt, gera a imagem, mostra um preview e permite **aceitar**, **descartar** ou
**gerar novamente**. Ao aceitar, a imagem vira um card novo (gerando pela
subcoleção) ou preenche um card existente (gerando pelo card).

## Decisões tomadas (brainstorming)

- **Onde a API roda:** Vercel Serverless Function (`/api/generate-image`). O app já
  está hospedado no Vercel. A chave do Google fica como env var server-side, nunca no
  bundle.
- **Modelo:** `gemini-2.5-flash-image` (Flash) como padrão, configurável por env
  (`GOOGLE_IMAGE_MODEL`) para trocar por `gemini-3-pro-image` (Pro) sem deploy de
  código. Nota: a página oficial de preços do Google lista os modelos de imagem como
  "Free tier: Not available"; fontes de terceiros sugerem cota grátis via AI Studio.
  Verificar com a própria API key. A arquitetura não muda independentemente disso.
- **Prompt template:** coluna nova `prompt_template` em `subcollections`, editável pela
  UI e persistida por estilo.
- **Parte variável:** marcador `{personagem}` dentro do template, substituído pelo
  texto digitado (permite a parte variável em qualquer posição do prompt).
- **Destino ao aceitar:** botão na subcoleção sempre cria card novo; botão dentro do
  CardModal preenche aquele card existente.
- **Metadados do card novo:** nome, número e tags são campos do modal (igual à criação
  de card vazio no AddFlow). O texto do personagem **não** é reaproveitado como nome.
- **Proporção:** detectada da imagem gerada e mapeada para o aspect ratio mais próximo
  (`1:1`, `9:16`, `3:4`). Não é escolhida manualmente.
- **Otimização:** toda imagem gerada passa pela otimização existente (`prepareImage`:
  WebP, máx 1600px) automaticamente antes de salvar, sem checkbox.

## Arquitetura

```
Navegador (React)                Vercel Function            Google API
─────────────────                ───────────────            ──────────
GenerateModal
  └─ POST /api/generate-image ──► api/generate-image.ts ──► gemini-2.5-flash-image
       { prompt, accessToken }       (GOOGLE_API_KEY,           retorna imagem
                                       GOOGLE_IMAGE_MODEL)       (base64 inline)
                                  ◄── { imageBase64, mimeType }
  preview + ações (Gerar novamente / Descartar / Salvar)
  └─ ao Salvar:
       base64 → File → prepareImage (otimização) → Supabase Storage + tabela cards
```

## Componentes

### 1. Migration `supabase/migrations/0003_subcollection_prompt.sql`

```sql
alter table public.subcollections add column prompt_template text;
```

Nulo = estilo sem geração configurada. O botão de geração fica desabilitado/oculto até
o template ser definido (e conter `{personagem}`).

### 2. Vercel Function `api/generate-image.ts`

- **Entrada:** `{ prompt: string, accessToken: string }`.
- **Auth guard:** valida `accessToken` no Supabase (server-side). Token inválido → 401.
  Evita que o endpoint público seja abusado e queime cota/billing.
- **Chamada Google:** `POST` para o endpoint generateContent do modelo em
  `GOOGLE_IMAGE_MODEL` com `GOOGLE_API_KEY`. Extrai a imagem inline (base64) da
  resposta.
- **Saída:** `{ imageBase64: string, mimeType: string }`.
- **Erros mapeados** (mensagens claras em PT, retornadas ao modal):
  - 429 / cota / billing não habilitado
  - prompt bloqueado por política de conteúdo
  - timeout / falha de rede
  - resposta sem imagem
- Env vars: `GOOGLE_API_KEY`, `GOOGLE_IMAGE_MODEL` (default `gemini-2.5-flash-image`),
  e as do Supabase para validar o token.

### 3. Camada de dados (`src/lib/catalog/`)

`types.ts`:
- `Subcollection` ganha `promptTemplate: string | null`.

`repository.ts`:
- `listSubcollections` / `createSubcollection` passam a ler/retornar `prompt_template`.
- `updateSubcollectionPrompt(id, template)` — salva o template editado.
- Salvar imagem gerada:
  - *Card novo:* `createCards(subId, [{ number, name, aspectRatio, tags }])`, depois
    upload da imagem no card recém-criado.
  - *Card existente:* `uploadCardImage(card, file)` (já existe) + `updateCard` com a
    proporção detectada.

Novo módulo `src/lib/catalog/generate.ts` (lógica isolada e testável):
- `buildPrompt(template, personagem)` — substitui `{personagem}`.
- `generateImage(prompt, accessToken)` — chama `/api/generate-image`.
- `base64ToFile(imageBase64, mimeType, filename)` — converte para `File`.
- `detectAspectRatio(file)` — carrega a imagem, calcula a razão e mapeia para
  `1:1` / `9:16` / `3:4` mais próximo.

### 4. UI

`src/components/GenerateModal.tsx` — componente único, dois modos:

- **Modo "card novo"** (aberto pelo botão na `StyleTabs`):
  - Textarea do template (pré-preenchido do estilo; salvo via
    `updateSubcollectionPrompt` ao gerar) + caixa do personagem + campos nome / número
    / tags (espelhando o AddFlow) + botão Gerar.
- **Modo "preencher card"** (aberto pelo botão no `CardModal`):
  - Só template + personagem; nome/número/tags vêm do card existente.
- **Após gerar (ambos):** preview da imagem + ações **Gerar novamente** ·
  **Descartar** · **Salvar**. Estado de "gerando…" e exibição de erros.
  Proporção detectada da imagem, não escolhida.

`src/components/StyleTabs.tsx`:
- Botão `✨ Gerar` (abre `GenerateModal` em modo card novo). Desabilitado quando o
  estilo ativo não tem `promptTemplate`.

`src/components/CardModal.tsx`:
- Botão "Gerar imagem" (abre `GenerateModal` em modo preencher card).

`src/pages/CollectionPage.tsx`:
- Estado e wiring de abertura/fechamento do `GenerateModal` e recarga dos cards após
  salvar (segue o padrão de `AddFlow`/`CardModal`).

## Fluxo de dados (gerar pela subcoleção → card novo)

1. Usuário clica `✨ Gerar` → abre `GenerateModal` (modo card novo).
2. Edita template (opcional) + digita personagem + preenche nome/número/tags → Gerar.
3. `buildPrompt` monta o prompt; `generateImage` chama a function; preview aparece.
4. Usuário clica Salvar:
   - (se template mudou) `updateSubcollectionPrompt`
   - `base64ToFile` → `prepareImage` (otimização) → `detectAspectRatio`
   - `createCards` cria o card; upload da imagem; `updateCard` com a proporção
5. Modal fecha; `CollectionPage` recarrega os cards.

Fluxo "preencher card" é igual, exceto que pula a criação e usa
`uploadCardImage` + `updateCard` no card existente.

## Tratamento de erros

- A function devolve erros com mensagem em PT; o modal exibe inline e mantém o usuário
  no mesmo estado para tentar novamente.
- Falha no upload/Supabase após gerar: mostra erro e mantém o preview (não perde a
  imagem gerada).
- Geração não destrói nada existente até o Salvar.

## Testes

- `generate.test.ts`: `buildPrompt` (substituição, ausência de marcador),
  `detectAspectRatio` (mapeamento de dimensões para o ratio mais próximo),
  `base64ToFile` (tipo/extensão).
- UI e function: testes finos com `fetch` mockado, focados nas mensagens de erro e no
  branch card-novo vs card-existente.

## Fora de escopo (YAGNI)

- Geração em lote / múltiplos personagens de uma vez.
- Histórico de gerações / galeria de descartadas.
- Edição/inpainting de imagem existente.
- Escolha de modelo pela UI (fica por env var).
```
