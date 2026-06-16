# Geração de imagens via nanobanana — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar imagens de cards no cat4Log via API de imagem do Google (nanobanana/Gemini), com prompt template por subcoleção, preview com aceitar/descartar/regerar, criando card novo ou preenchendo um existente.

**Architecture:** Front React (Vite) chama uma Vercel Serverless Function (`/api/generate-image`) que guarda a chave do Google e faz a chamada ao modelo; o navegador recebe a imagem em base64, mostra preview e, ao aceitar, otimiza (WebP) e salva no Supabase Storage + tabela `cards`. Prompt template fica em coluna nova de `subcollections`. Proporção é detectada da imagem gerada.

**Tech Stack:** React 19, TypeScript, Vite, Supabase (Postgres + Storage), Vercel Functions, Vitest, framer-motion, lucide-react, browser-image-compression.

Spec: [docs/superpowers/specs/2026-06-16-geracao-imagens-nanobanana-design.md](../specs/2026-06-16-geracao-imagens-nanobanana-design.md)

---

## File Structure

- `supabase/migrations/0003_subcollection_prompt.sql` — adiciona `prompt_template`.
- `src/lib/catalog/types.ts` — `Subcollection.promptTemplate`.
- `src/lib/catalog/repository.ts` — ler/gravar `prompt_template`; `updateSubcollectionPrompt`; `createCard` (retorna o card criado).
- `src/lib/catalog/generate.ts` — lógica pura/cliente: `buildPrompt`, `nearestAspectRatio`, `detectAspectRatio`, `base64ToFile`, `generateImage`.
- `src/lib/catalog/generate.test.ts` — testes das funções puras.
- `api/generate-image.ts` — Vercel Function (proxy Google + auth guard).
- `src/components/GenerateModal.tsx` — modal de geração (2 modos).
- `src/components/StyleTabs.tsx` — botão "Gerar".
- `src/components/CardModal.tsx` — botão "Gerar imagem".
- `src/pages/CollectionPage.tsx` — wiring de estado.
- `.env.example` — novas env vars.

---

## Task 1: Migration + tipo `promptTemplate`

**Files:**
- Create: `supabase/migrations/0003_subcollection_prompt.sql`
- Modify: `src/lib/catalog/types.ts:11-17`

- [ ] **Step 1: Criar a migration**

Create `supabase/migrations/0003_subcollection_prompt.sql`:

```sql
-- Prompt template por estilo, com marcador {personagem}
alter table public.subcollections add column prompt_template text;
```

- [ ] **Step 2: Adicionar o campo ao tipo**

Em `src/lib/catalog/types.ts`, na interface `Subcollection`, adicionar o campo:

```typescript
export interface Subcollection {
  id: string
  collectionId: string
  slug: string
  name: string
  sortOrder: number
  promptTemplate: string | null
}
```

- [ ] **Step 3: Verificar compilação (vai falhar de propósito nos mapeamentos)**

Run: `npx tsc -b --noEmit`
Expected: erros em `repository.ts` por falta de `promptTemplate` nos objetos `Subcollection`. Isso é esperado e será corrigido na Task 2.

- [ ] **Step 4: Aplicar a migration no Supabase**

Aplicar `0003_subcollection_prompt.sql` no projeto Supabase (SQL Editor ou CLI), igual às migrations anteriores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_subcollection_prompt.sql src/lib/catalog/types.ts
git commit -m "feat(db): prompt_template em subcollections"
```

---

## Task 2: Camada de dados (repository)

**Files:**
- Modify: `src/lib/catalog/repository.ts`

- [ ] **Step 1: Mapear `prompt_template` em `listSubcollections`**

Em `src/lib/catalog/repository.ts`, na função `listSubcollections` (≈linha 69), trocar o `.map` para incluir o campo:

```typescript
  return data.map((s) => ({
    id: s.id, collectionId: s.collection_id, slug: s.slug, name: s.name,
    sortOrder: s.sort_order, promptTemplate: s.prompt_template ?? null,
  }))
```

- [ ] **Step 2: Incluir `promptTemplate` no retorno de `createSubcollection`**

Na função `createSubcollection` (≈linha 109), o `.select('*')` já traz a coluna; ajustar o objeto retornado:

```typescript
  return {
    id: data.id, collectionId: data.collection_id, slug: data.slug, name: data.name,
    sortOrder: data.sort_order, promptTemplate: data.prompt_template ?? null,
  }
```

- [ ] **Step 3: Adicionar `updateSubcollectionPrompt`**

Logo após `renameSubcollection` (≈linha 125), adicionar:

```typescript
export async function updateSubcollectionPrompt(id: string, template: string): Promise<void> {
  const { error } = await supabase
    .from('subcollections').update({ prompt_template: template }).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Adicionar `createCard` (cria 1 card e retorna ele)**

Após `createCards` (≈linha 145), adicionar uma função que cria um único card e retorna o `Card` (necessário para fazer upload da imagem no card recém-criado):

```typescript
export async function createCard(subcollectionId: string, card: NewCard): Promise<Card> {
  const { data: sub, error: subErr } = await supabase
    .from('subcollections').select('collection_id').eq('id', subcollectionId).single()
  if (subErr) throw subErr
  const existing = await listCardsBySubcollection(subcollectionId)
  const [numbered] = assignNumbers([card], existing.map((c) => c.number))
  const { data, error } = await supabase.from('cards').insert({
    collection_id: sub.collection_id,
    subcollection_id: subcollectionId,
    number: numbered.number,
    name: numbered.name,
    aspect_ratio: numbered.aspectRatio,
    tags: numbered.tags,
    sort_order: existing.length,
  }).select('*').single()
  if (error) throw error
  return toCard(data as CardRow)
}
```

- [ ] **Step 5: Verificar compilação**

Run: `npx tsc -b --noEmit`
Expected: PASS (sem erros).

- [ ] **Step 6: Commit**

```bash
git add src/lib/catalog/repository.ts
git commit -m "feat(data): updateSubcollectionPrompt e createCard"
```

---

## Task 3: Funções puras de geração (`generate.ts`) — TDD

**Files:**
- Create: `src/lib/catalog/generate.test.ts`
- Create: `src/lib/catalog/generate.ts`

- [ ] **Step 1: Escrever os testes que falham**

Create `src/lib/catalog/generate.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { buildPrompt, nearestAspectRatio } from './generate'

describe('buildPrompt', () => {
  it('substitui {personagem} pelo texto', () => {
    expect(buildPrompt('retrato de {personagem} no estilo X', 'Pikachu'))
      .toBe('retrato de Pikachu no estilo X')
  })
  it('substitui todas as ocorrências', () => {
    expect(buildPrompt('{personagem} e {personagem}', 'Eevee'))
      .toBe('Eevee e Eevee')
  })
  it('faz trim do personagem', () => {
    expect(buildPrompt('a {personagem}', '  Snorlax  ')).toBe('a Snorlax')
  })
})

describe('nearestAspectRatio', () => {
  it('mapeia quadrado para 1:1', () => {
    expect(nearestAspectRatio(1024, 1024)).toBe('1:1')
  })
  it('mapeia retrato alto para 9:16', () => {
    expect(nearestAspectRatio(1080, 1920)).toBe('9:16')
  })
  it('mapeia retrato médio para 3:4', () => {
    expect(nearestAspectRatio(900, 1200)).toBe('3:4')
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/lib/catalog/generate.test.ts`
Expected: FAIL (módulo `./generate` não existe).

- [ ] **Step 3: Implementar as funções puras**

Create `src/lib/catalog/generate.ts`:

```typescript
import type { AspectRatio } from './types'

export const PERSONAGEM_TOKEN = '{personagem}'

/** Substitui o marcador {personagem} (todas as ocorrências) pelo texto informado. */
export function buildPrompt(template: string, personagem: string): string {
  return template.split(PERSONAGEM_TOKEN).join(personagem.trim())
}

const RATIO_VALUES: Record<AspectRatio, number> = {
  '1:1': 1,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
}

/** Mapeia largura/altura para o AspectRatio suportado mais próximo. */
export function nearestAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height
  let best: AspectRatio = '1:1'
  let bestDiff = Infinity
  for (const key of Object.keys(RATIO_VALUES) as AspectRatio[]) {
    const diff = Math.abs(RATIO_VALUES[key] - ratio)
    if (diff < bestDiff) { bestDiff = diff; best = key }
  }
  return best
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npx vitest run src/lib/catalog/generate.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog/generate.ts src/lib/catalog/generate.test.ts
git commit -m "feat(generate): buildPrompt e nearestAspectRatio com testes"
```

---

## Task 4: Helpers de imagem + cliente da API (`generate.ts`)

**Files:**
- Modify: `src/lib/catalog/generate.ts`

- [ ] **Step 1: Adicionar `base64ToFile` e `detectAspectRatio`**

Acrescentar ao final de `src/lib/catalog/generate.ts`:

```typescript
/** Converte imagem base64 (sem prefixo data:) num File. */
export function base64ToFile(base64: string, mimeType: string, filename: string): File {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new File([arr], filename, { type: mimeType })
}

/** Carrega o File numa <img> e devolve o AspectRatio mais próximo das dimensões reais. */
export function detectAspectRatio(file: File): Promise<AspectRatio> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(nearestAspectRatio(img.naturalWidth, img.naturalHeight))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao ler a imagem gerada')) }
    img.src = url
  })
}
```

- [ ] **Step 2: Adicionar o cliente `generateImage`**

Acrescentar ao final de `src/lib/catalog/generate.ts`:

```typescript
import { supabase } from '../supabase'

export interface GeneratedImage { imageBase64: string; mimeType: string }

/** Chama a Vercel Function que faz o proxy para o Google. */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, accessToken }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Falha na geração (${res.status})`)
  }
  return res.json() as Promise<GeneratedImage>
}
```

Nota: mover o `import { supabase }` e `import type { AspectRatio }` para o topo do arquivo (não deixar import no meio). Garantir que `AspectRatio` e `supabase` estejam importados uma única vez no topo.

- [ ] **Step 3: Verificar compilação e testes**

Run: `npx tsc -b --noEmit && npx vitest run src/lib/catalog/generate.test.ts`
Expected: PASS (compila; 6 testes continuam passando).

- [ ] **Step 4: Commit**

```bash
git add src/lib/catalog/generate.ts
git commit -m "feat(generate): base64ToFile, detectAspectRatio e cliente generateImage"
```

---

## Task 5: Vercel Function `api/generate-image.ts`

**Files:**
- Create: `api/generate-image.ts`
- Modify: `.env.example`

- [ ] **Step 1: Criar a function**

Create `api/generate-image.ts`:

```typescript
// Vercel Serverless Function (Node runtime).
// Recebe { prompt, accessToken }, valida a sessão no Supabase, chama o Google e
// devolve { imageBase64, mimeType }.

const MODEL = process.env.GOOGLE_IMAGE_MODEL || 'gemini-2.5-flash-image'

interface Body { prompt?: string; accessToken?: string }

async function validateSession(accessToken: string): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return false
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${accessToken}` },
  })
  return res.ok
}

export default async function handler(req: { method?: string; body: Body }, res: {
  status: (code: number) => { json: (data: unknown) => void }
}) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const body: Body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { prompt, accessToken } = body
  if (!prompt || !accessToken) return res.status(400).json({ error: 'Prompt ou sessão ausente' })

  if (!(await validateSession(accessToken))) {
    return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' })
  }

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_API_KEY não configurada' })

  try {
    const googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    )

    if (!googleRes.ok) {
      const status = googleRes.status
      const msg = status === 429
        ? 'Cota/limite atingido ou billing não habilitado no Google.'
        : `Erro do Google (${status}).`
      return res.status(502).json({ error: msg })
    }

    const data = await googleRes.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const inline = parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData)?.inlineData
    if (!inline) {
      return res.status(502).json({ error: 'O modelo não retornou imagem (prompt pode ter sido bloqueado).' })
    }
    return res.status(200).json({ imageBase64: inline.data, mimeType: inline.mimeType })
  } catch {
    return res.status(504).json({ error: 'Tempo esgotado ou falha de rede ao chamar o Google.' })
  }
}
```

- [ ] **Step 2: Documentar env vars**

Em `.env.example`, acrescentar ao final:

```
# Geração de imagens (Vercel Function — server-side, nunca expostas no bundle)
GOOGLE_API_KEY=sua-chave-google-ai-studio
GOOGLE_IMAGE_MODEL=gemini-2.5-flash-image
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc -b --noEmit`
Expected: PASS. (Se `tsc` reclamar de `api/` fora do include, deixar como está — o Vercel compila `api/` no deploy. Caso a config do projeto inclua `api/` e falte tipo, os tipos inline acima cobrem o uso.)

- [ ] **Step 4: Configurar as env vars no Vercel**

No painel do Vercel (Project → Settings → Environment Variables): adicionar `GOOGLE_API_KEY` e `GOOGLE_IMAGE_MODEL`. Confirmar que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` já existem (usadas para validar a sessão).

- [ ] **Step 5: Commit**

```bash
git add api/generate-image.ts .env.example
git commit -m "feat(api): Vercel Function de geração de imagem (proxy Google)"
```

---

## Task 6: `GenerateModal` (UI, 2 modos)

**Files:**
- Create: `src/components/GenerateModal.tsx`

- [ ] **Step 1: Criar o componente**

Create `src/components/GenerateModal.tsx`:

```tsx
import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X, Sparkles, RefreshCw } from 'lucide-react'
import type { Card, NewCard, Subcollection } from '../lib/catalog/types'
import {
  base64ToFile, buildPrompt, detectAspectRatio, generateImage, PERSONAGEM_TOKEN,
} from '../lib/catalog/generate'
import {
  createCard, updateCard, updateSubcollectionPrompt, uploadCardImage,
} from '../lib/catalog/repository'

type Props =
  | { mode: 'new'; subcollection: Subcollection; onClose: () => void; onSaved: () => void }
  | { mode: 'fill'; subcollection: Subcollection; card: Card; onClose: () => void; onSaved: () => void }

export function GenerateModal(props: Props) {
  const { subcollection, onClose, onSaved } = props
  const reduce = useReducedMotion()
  const [template, setTemplate] = useState(subcollection.promptTemplate ?? '')
  const [personagem, setPersonagem] = useState('')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ base64: string; mime: string } | null>(null)

  const hasToken = template.includes(PERSONAGEM_TOKEN)
  const canGenerate = hasToken && personagem.trim() !== '' && !busy
  const canSave = preview !== null && !busy && (props.mode === 'fill' || name.trim() !== '')

  async function generate() {
    setBusy(true); setError(null)
    try {
      const prompt = buildPrompt(template, personagem)
      const img = await generateImage(prompt)
      setPreview({ base64: img.imageBase64, mime: img.mimeType })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na geração')
    } finally { setBusy(false) }
  }

  async function save() {
    if (!preview) return
    setBusy(true); setError(null)
    try {
      if (template !== (subcollection.promptTemplate ?? '')) {
        await updateSubcollectionPrompt(subcollection.id, template)
      }
      const file = base64ToFile(preview.base64, preview.mime, 'gen.png')
      const ratio = await detectAspectRatio(file)
      if (props.mode === 'new') {
        const newCard: NewCard = {
          number: number.trim() || undefined,
          name: name.trim(),
          aspectRatio: ratio,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }
        const created = await createCard(subcollection.id, newCard)
        await uploadCardImage(created, file)
      } else {
        await uploadCardImage(props.card, file)
        await updateCard(props.card.id, { aspectRatio: ratio })
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar')
      setBusy(false)
    }
  }

  const previewUrl = preview ? `data:${preview.mime};base64,${preview.base64}` : null

  return (
    <div className="fixed inset-0 z-30 grid place-items-center p-4 sm:p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="modal-card max-w-lg space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">
            {props.mode === 'new' ? `Gerar em ${subcollection.name}` : `Gerar para ${props.card.name}`}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="text-on-variant transition hover:text-on-surface"><X /></button>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-on-faint">
            Prompt (use {PERSONAGEM_TOKEN})
          </label>
          <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={3}
            placeholder={`ex: retrato de ${PERSONAGEM_TOKEN} no estilo aquarela, 9:16`} className="field" />
          {!hasToken && <p className="mt-1 text-xs text-red-400">O prompt precisa conter {PERSONAGEM_TOKEN}.</p>}
        </div>

        <input value={personagem} onChange={(e) => setPersonagem(e.target.value)}
          placeholder="Personagem (parte variável)" className="field" />

        {props.mode === 'new' && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input value={number} onChange={(e) => setNumber(e.target.value)}
                placeholder="Número (vazio = próximo)" className="field !w-44" />
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Nome do card" className="field flex-1" />
            </div>
            <input value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="tags, por vírgula" className="field" />
          </div>
        )}

        {previewUrl && (
          <div className="overflow-hidden rounded-lg border border-surface-bright/60">
            <img src={previewUrl} alt="Pré-visualização" className="max-h-[40vh] w-full object-contain bg-surface-dim" />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!preview ? (
          <button disabled={!canGenerate} onClick={generate} className="btn-primary w-full">
            <Sparkles size={16} /> {busy ? 'Gerando…' : 'Gerar'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button disabled={busy} onClick={generate} className="btn-ghost flex-1">
              <RefreshCw size={16} /> Gerar novamente
            </button>
            <button disabled={busy} onClick={() => setPreview(null)} className="btn-ghost flex-1">Descartar</button>
            <button disabled={!canSave} onClick={save} className="btn-primary flex-1">
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/GenerateModal.tsx
git commit -m "feat(ui): GenerateModal com preview e regenerar"
```

---

## Task 7: Wiring (StyleTabs, CardModal, CollectionPage)

**Files:**
- Modify: `src/components/StyleTabs.tsx`
- Modify: `src/components/CardModal.tsx`
- Modify: `src/pages/CollectionPage.tsx`

- [ ] **Step 1: Botão "Gerar" no `StyleTabs`**

Em `src/components/StyleTabs.tsx`: adicionar `Sparkles` ao import do lucide-react e a prop `onGenerate` à interface `Props`:

```tsx
import { Pencil, Plus, Sparkles } from 'lucide-react'
```

```tsx
interface Props {
  collection: Collection
  subcollections: Subcollection[]
  activeStyleSlug: string | null
  onCreateStyle: () => void
  onRenameStyle: (s: Subcollection) => void
  onGenerate: () => void
}
```

Desestruturar `onGenerate` e, logo após o botão de renomear (depois do bloco `{active && (...)}`), adicionar o botão — só aparece quando há estilo ativo:

```tsx
      {active && (
        <button onClick={onGenerate} aria-label="Gerar imagem"
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-on-variant transition hover:bg-surface-2 hover:text-on-surface">
          <Sparkles size={14} /> gerar
        </button>
      )}
```

- [ ] **Step 2: Botão "Gerar imagem" no `CardModal`**

Em `src/components/CardModal.tsx`: adicionar `Sparkles` ao import lucide e uma prop `onGenerate`:

```tsx
import { X, Upload, Trash2, Sparkles } from 'lucide-react'
```

Mudar a assinatura para aceitar `onGenerate`:

```tsx
export function CardModal({ card, onClose, onChanged, onGenerate }: {
  card: Card; onClose: () => void; onChanged: () => void; onGenerate: () => void
}) {
```

Adicionar o botão logo após o botão de upload (depois do `</button>` do "Enviar/Trocar imagem", ≈linha 61):

```tsx
            <button disabled={busy} onClick={onGenerate} className="btn-ghost w-full">
              <Sparkles size={16} /> Gerar com IA
            </button>
```

- [ ] **Step 3: Wiring no `CollectionPage`**

Em `src/pages/CollectionPage.tsx`:

(a) Importar o modal e o `Subcollection` já existe. Adicionar o import:

```tsx
import { GenerateModal } from '../components/GenerateModal'
```

(b) Adicionar estado para a geração (perto dos outros `useState`, ≈linha 44):

```tsx
  const [generatingNew, setGeneratingNew] = useState(false)
  const [generatingCard, setGeneratingCard] = useState<Card | null>(null)
```

(c) Passar `onGenerate` ao `StyleTabs` (≈linha 86):

```tsx
          <StyleTabs collection={collection} subcollections={subs} activeStyleSlug={style ?? null}
            onCreateStyle={() => setNewStyleOpen(true)} onRenameStyle={(s) => setRenaming(s)}
            onGenerate={() => setGeneratingNew(true)} />
```

(d) Passar `onGenerate` ao `CardModal` (≈linha 111). Ao gerar a partir do card, fecha o CardModal e abre o GenerateModal em modo fill:

```tsx
      {active && (
        <CardModal card={active} onClose={() => setActive(null)}
          onChanged={() => { if (collection) loadCards(collection, activeStyle) }}
          onGenerate={() => { setGeneratingCard(active); setActive(null) }} />
      )}
```

(e) Renderizar o `GenerateModal`. O modo "new" usa o estilo ativo (ou o primeiro). Adicionar antes do fechamento do componente (junto aos outros modais, ≈linha 147):

```tsx
      {generatingNew && (activeStyle ?? subs[0]) && (
        <GenerateModal mode="new" subcollection={activeStyle ?? subs[0]}
          onClose={() => setGeneratingNew(false)}
          onSaved={() => { setGeneratingNew(false); if (collection) loadCards(collection, activeStyle) }} />
      )}
      {generatingCard && (subs.find((s) => s.id === generatingCard.subcollectionId) ?? subs[0]) && (
        <GenerateModal mode="fill"
          subcollection={subs.find((s) => s.id === generatingCard.subcollectionId) ?? subs[0]}
          card={generatingCard}
          onClose={() => setGeneratingCard(null)}
          onSaved={() => { setGeneratingCard(null); if (collection) loadCards(collection, activeStyle) }} />
      )}
```

- [ ] **Step 4: Verificar compilação e lint**

Run: `npx tsc -b --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Build de sanidade**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/StyleTabs.tsx src/components/CardModal.tsx src/pages/CollectionPage.tsx
git commit -m "feat(ui): wiring do GenerateModal em StyleTabs, CardModal e CollectionPage"
```

---

## Task 8: Verificação manual end-to-end

**Files:** nenhum (validação).

- [ ] **Step 1: Rodar testes completos**

Run: `npm test`
Expected: todos os testes passam (incluindo `generate.test.ts`).

- [ ] **Step 2: Verificação manual (precisa de deploy/preview Vercel + env vars)**

Como a função roda no Vercel, validar num Preview Deployment (ou `vercel dev` local com as env vars):
1. Definir um `prompt_template` num estilo (via SQL ou pela UI ao gerar).
2. Estilo ativo → botão "gerar" → digitar personagem + nome → Gerar → ver preview.
3. "Gerar novamente" troca a imagem; "Descartar" volta ao formulário.
4. Salvar → card novo aparece na grade com a imagem e proporção corretas.
5. Abrir um card → "Gerar com IA" → gerar → salvar → imagem do card é substituída.
6. Forçar erro (ex.: remover `GOOGLE_API_KEY`) → mensagem de erro aparece no modal.

- [ ] **Step 3: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "test: verificação e ajustes finais da geração nanobanana"
```

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** schema (T1), repository/dados (T2), funções puras (T3), helpers+cliente (T4), Vercel Function (T5), GenerateModal 2 modos (T6), botões e wiring (T7), proporção detectada (T3/T4/T6), otimização sempre ligada via `uploadCardImage`→`prepareImage` (T6), tratamento de erros (T5/T6), testes (T3/T8). ✓
- **Placeholders:** nenhum TODO/TBD; todo passo com código completo. ✓
- **Consistência de tipos:** `buildPrompt`, `nearestAspectRatio`, `detectAspectRatio`, `base64ToFile`, `generateImage`, `GeneratedImage`, `createCard`, `updateSubcollectionPrompt`, `PERSONAGEM_TOKEN` usados com a mesma assinatura entre tasks. `uploadCardImage(card, file)` usa o default `optimize=true` (otimização garantida). ✓
- **Nota de atenção (execução):** `uploadCardImage` salva a imagem com extensão `.webp` quando otimizada — coerente com o comportamento atual; nenhuma mudança necessária.
```
