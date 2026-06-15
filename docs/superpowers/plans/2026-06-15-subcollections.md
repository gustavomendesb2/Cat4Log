# Subcollections & Custom Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom collections, per-collection subcollections ("styles") with an aggregate "Geral" view, auto-numbering of cards, and aspect-ratio choice on CSV import — on top of the existing Collection Studio base.

**Architecture:** New `subcollections` table; `cards` reference a subcollection and keep a denormalized `collection_id` for the aggregate view. Pure helpers (`numbering.ts`) handle next-number and slug logic (TDD). The repository gains subcollection/collection CRUD; the UI gains a `StyleTabs` row, a reusable `NameModal`, dynamic collection tabs, and a style-aware `AddFlow`.

**Tech Stack:** React 19, Vite, TypeScript, Supabase, React Router, Vitest.

**Spec:** [docs/superpowers/specs/2026-06-15-subcollections-design.md](../specs/2026-06-15-subcollections-design.md)

---

## File Structure

**Created:**
- `supabase/migrations/0002_subcollections.sql` — new table + data migration
- `src/lib/catalog/numbering.ts` — `nextNumber`, `assignNumbers`, `slugify` (pure, TDD)
- `src/lib/catalog/numbering.test.ts`
- `src/components/StyleTabs.tsx` — Geral/styles tab row
- `src/components/NameModal.tsx` — reusable name-prompt modal

**Modified:**
- `src/lib/catalog/types.ts` — add `Subcollection`, `Card.subcollectionId`, optional `NewCard.number`
- `src/lib/catalog/csv.ts` + `csv.test.ts` — allow empty number
- `src/lib/catalog/repository.ts` — subcollection/collection CRUD, scope-aware card listing, autonumber on insert
- `src/components/TopNavBar.tsx` — dynamic collections + "Nova coleção"
- `src/components/AddFlow.tsx` — style target selector + CSV aspect-ratio selector
- `src/pages/CollectionPage.tsx` — `:style` route, scope logic, StyleTabs
- `src/main.tsx` — add `/:collection/:style` route

---

## Phase A — Database migration (manual, owner)

### Task A.1: Subcollections migration

**Files:** Create `supabase/migrations/0002_subcollections.sql`.

- [ ] **Step 1: Write the migration**
```sql
-- Subcollections ("styles")
create table public.subcollections (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, slug)
);

alter table public.subcollections enable row level security;
create policy "auth read subcollections" on public.subcollections for select to authenticated using (true);
create policy "auth write subcollections" on public.subcollections for all to authenticated using (true) with check (true);

-- Card -> subcollection link (nullable during migration)
alter table public.cards add column subcollection_id uuid references public.subcollections(id) on delete cascade;

-- One "Padrão" style per existing collection
insert into public.subcollections (collection_id, slug, name, sort_order)
select id, 'padrao', 'Padrão', 0 from public.collections;

-- Attach every existing card to its collection's "Padrão" style
update public.cards c
set subcollection_id = s.id
from public.subcollections s
where s.collection_id = c.collection_id and s.slug = 'padrao';

-- Now enforce NOT NULL
alter table public.cards alter column subcollection_id set not null;

create index cards_subcollection_idx on public.cards(subcollection_id, sort_order);
```

- [ ] **Step 2: Apply it (owner)** — paste into Supabase → SQL Editor → Run.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify migration** — run in SQL Editor:
```sql
select c.slug, s.name as style, count(k.id) as cards
from public.collections c
join public.subcollections s on s.collection_id = c.id
left join public.cards k on k.subcollection_id = s.id
group by c.slug, s.name order by c.slug;
```
Expected: row `pokemon | Padrão | 151` and `naruto | Padrão | 0`.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/0002_subcollections.sql
git commit -m "feat: subcollections migration"
```

---

## Phase B — Pure helpers (TDD)

### Task B.1: numbering + slugify

**Files:** Create `src/lib/catalog/numbering.ts`, `src/lib/catalog/numbering.test.ts`.

- [ ] **Step 1: Write failing tests**
```ts
import { describe, expect, it } from 'vitest'
import { assignNumbers, nextNumber, slugify } from './numbering'
import type { NewCard } from './types'

const nc = (over: Partial<NewCard>): NewCard => ({ name: 'X', aspectRatio: '9:16', tags: [], ...over })

describe('nextNumber', () => {
  it('returns 001 for empty input', () => expect(nextNumber([])).toBe('001'))
  it('returns max+1 padded to 3 digits', () => expect(nextNumber(['001', '151'])).toBe('152'))
  it('ignores non-numeric entries', () => expect(nextNumber(['abc', '009', ''])).toBe('010'))
})

describe('assignNumbers', () => {
  it('fills empty numbers sequentially from the max', () => {
    const rows = [nc({ number: '' }), nc({ number: '' })]
    expect(assignNumbers(rows, ['001', '002']).map((r) => r.number)).toEqual(['003', '004'])
  })
  it('keeps explicit numbers and avoids colliding empties with them', () => {
    const rows = [nc({ number: '010' }), nc({ number: '' })]
    expect(assignNumbers(rows, []).map((r) => r.number)).toEqual(['010', '011'])
  })
})

describe('slugify', () => {
  it('lowercases and hyphenates', () => expect(slugify('Estilo A')).toBe('estilo-a'))
  it('strips accents and punctuation', () => expect(slugify('Pókemon Galáxia!')).toBe('pokemon-galaxia'))
})
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/lib/catalog/numbering.test.ts`
Expected: FAIL ("assignNumbers is not a function").

- [ ] **Step 3: Implement `numbering.ts`**
```ts
import type { NewCard } from './types'

function maxInt(numbers: string[]): number {
  return numbers.reduce((max, n) => {
    const v = parseInt(n, 10)
    return Number.isFinite(v) && v > max ? v : max
  }, 0)
}

export function nextNumber(existing: string[]): string {
  return String(maxInt(existing) + 1).padStart(3, '0')
}

/** Fill rows with an empty `number` using sequential numbers from the current max. */
export function assignNumbers(rows: NewCard[], existing: string[]): NewCard[] {
  const explicit = rows.map((r) => r.number ?? '').filter((n) => n.trim() !== '')
  let n = maxInt([...existing, ...explicit])
  return rows.map((r) => {
    if (r.number && r.number.trim() !== '') return r
    n += 1
    return { ...r, number: String(n).padStart(3, '0') }
  })
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/lib/catalog/numbering.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**
```bash
git add src/lib/catalog/numbering.ts src/lib/catalog/numbering.test.ts
git commit -m "feat: numbering + slugify helpers"
```

---

## Phase C — Types, CSV, repository

### Task C.1: Update types

**Files:** Modify `src/lib/catalog/types.ts`.

- [ ] **Step 1: Add `Subcollection`, `Card.subcollectionId`, optional `NewCard.number`** — replace the `Card` and `NewCard` interfaces and add `Subcollection`:
```ts
export interface Collection {
  id: string
  slug: string
  name: string
  sortOrder: number
}

export interface Subcollection {
  id: string
  collectionId: string
  slug: string
  name: string
  sortOrder: number
}

export interface Card {
  id: string
  collectionId: string
  subcollectionId: string
  number: string
  name: string
  imagePath: string | null
  aspectRatio: AspectRatio
  tags: string[]
  status: CardStatus
  sortOrder: number
}

/** A new card before it exists in the DB. `number` empty/undefined triggers auto-numbering. */
export interface NewCard {
  number?: string
  name: string
  aspectRatio: AspectRatio
  tags: string[]
}
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/catalog/types.ts
git commit -m "feat: subcollection types"
```

### Task C.2: CSV parser allows empty number

**Files:** Modify `src/lib/catalog/csv.ts`, `src/lib/catalog/csv.test.ts`.

The new rule: `name` required; `number` optional (empty allowed, becomes `''` for later auto-numbering).

- [ ] **Step 1: Update the failing-fields test** — in `csv.test.ts`, replace the `'reports rows missing required fields and skips them'` test with:
```ts
  it('allows empty number (auto-numbered later) but requires name', () => {
    const csv = 'number,name\n,Bulbasaur\n007,'
    const out = parseCardsCsv(csv)
    expect(out.rows).toEqual([{ number: '', name: 'Bulbasaur', aspectRatio: '3:4', tags: [] }])
    expect(out.errors).toHaveLength(1)
  })
```

- [ ] **Step 2: Run, verify the new test fails**

Run: `npx vitest run src/lib/catalog/csv.test.ts`
Expected: FAIL (current parser errors on empty number).

- [ ] **Step 3: Update `csv.ts`** — replace the row loop body (the `for` loop) with:
```ts
  const rows: NewCard[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const number = (cols[numIdx] ?? '').trim()
    const name = (cols[nameIdx] ?? '').trim()
    if (!name) {
      errors.push(`Row ${i}: missing name`)
      continue
    }
    const rawTags = tagsIdx === -1 ? '' : (cols[tagsIdx] ?? '').trim()
    const tags = rawTags ? rawTags.split(';').map((t) => t.trim()).filter(Boolean) : []
    rows.push({ number, name, aspectRatio: '3:4', tags })
  }
  return { rows, errors }
```

- [ ] **Step 4: Run, verify all CSV tests pass**

Run: `npx vitest run src/lib/catalog/csv.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**
```bash
git add src/lib/catalog/csv.ts src/lib/catalog/csv.test.ts
git commit -m "feat: CSV allows empty number for auto-numbering"
```

### Task C.3: Repository — subcollections, collections, scope-aware listing, autonumber

**Files:** Modify `src/lib/catalog/repository.ts`.

- [ ] **Step 1: Update imports + `CardRow` + `toCard`** — replace lines 1-31 (imports through `toCard`) with:
```ts
import { supabase } from '../supabase'
import { prepareImage } from './image'
import { assignNumbers, slugify } from './numbering'
import type { AspectRatio, Card, Collection, NewCard, Subcollection } from './types'

const BUCKET = 'card-images'

interface CardRow {
  id: string
  collection_id: string
  subcollection_id: string
  number: string
  name: string
  image_path: string | null
  aspect_ratio: AspectRatio
  tags: string[]
  status: 'empty' | 'filled'
  sort_order: number
}

function toCard(r: CardRow): Card {
  return {
    id: r.id,
    collectionId: r.collection_id,
    subcollectionId: r.subcollection_id,
    number: r.number,
    name: r.name,
    imagePath: r.image_path,
    aspectRatio: r.aspect_ratio,
    tags: r.tags ?? [],
    status: r.status,
    sortOrder: r.sort_order,
  }
}
```

- [ ] **Step 2: Replace `listCards` (lines 52-57)** with scope-aware listing:
```ts
export async function listCardsByCollection(collectionId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards').select('*').eq('collection_id', collectionId).order('sort_order')
  if (error) throw error
  return (data as CardRow[]).map(toCard)
}

export async function listCardsBySubcollection(subcollectionId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards').select('*').eq('subcollection_id', subcollectionId).order('sort_order')
  if (error) throw error
  return (data as CardRow[]).map(toCard)
}
```

- [ ] **Step 3: Replace `createCards` (the old function)** with the subcollection-aware, auto-numbering version:
```ts
export async function listSubcollections(collectionId: string): Promise<Subcollection[]> {
  const { data, error } = await supabase
    .from('subcollections').select('*').eq('collection_id', collectionId).order('sort_order')
  if (error) throw error
  return data.map((s) => ({
    id: s.id, collectionId: s.collection_id, slug: s.slug, name: s.name, sortOrder: s.sort_order,
  }))
}

async function uniqueCollectionSlug(base: string): Promise<string> {
  const { data, error } = await supabase.from('collections').select('slug')
  if (error) throw error
  const taken = new Set((data ?? []).map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

async function uniqueStyleSlug(collectionId: string, base: string): Promise<string> {
  const { data, error } = await supabase
    .from('subcollections').select('slug').eq('collection_id', collectionId)
  if (error) throw error
  const taken = new Set((data ?? []).map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

export async function createCollection(name: string): Promise<Collection> {
  const slug = await uniqueCollectionSlug(slugify(name) || 'colecao')
  const { data: maxRow } = await supabase
    .from('collections').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const sortOrder = (maxRow?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('collections').insert({ slug, name, sort_order: sortOrder }).select('*').single()
  if (error) throw error
  const { error: subErr } = await supabase
    .from('subcollections').insert({ collection_id: data.id, slug: 'padrao', name: 'Padrão', sort_order: 0 })
  if (subErr) throw subErr
  return { id: data.id, slug: data.slug, name: data.name, sortOrder: data.sort_order }
}

export async function createSubcollection(collectionId: string, name: string): Promise<Subcollection> {
  const slug = await uniqueStyleSlug(collectionId, slugify(name) || 'estilo')
  const { data: maxRow } = await supabase
    .from('subcollections').select('sort_order').eq('collection_id', collectionId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const sortOrder = (maxRow?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('subcollections').insert({ collection_id: collectionId, slug, name, sort_order: sortOrder })
    .select('*').single()
  if (error) throw error
  return { id: data.id, collectionId: data.collection_id, slug: data.slug, name: data.name, sortOrder: data.sort_order }
}

export async function renameSubcollection(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('subcollections').update({ name }).eq('id', id)
  if (error) throw error
}

export async function createCards(subcollectionId: string, cards: NewCard[]): Promise<void> {
  if (cards.length === 0) return
  const { data: sub, error: subErr } = await supabase
    .from('subcollections').select('collection_id').eq('id', subcollectionId).single()
  if (subErr) throw subErr
  const existing = await listCardsBySubcollection(subcollectionId)
  const numbered = assignNumbers(cards, existing.map((c) => c.number))
  const rows = numbered.map((c, i) => ({
    collection_id: sub.collection_id,
    subcollection_id: subcollectionId,
    number: c.number,
    name: c.name,
    aspect_ratio: c.aspectRatio,
    tags: c.tags,
    sort_order: existing.length + i,
  }))
  const { error } = await supabase.from('cards').insert(rows)
  if (error) throw error
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: errors only in files that still call the old `listCards`/`createCards` signatures (CollectionPage, AddFlow) — fixed in Phase D. If errors appear ONLY in `src/pages/CollectionPage.tsx` and `src/components/AddFlow.tsx`, proceed.

- [ ] **Step 5: Commit**
```bash
git add src/lib/catalog/repository.ts
git commit -m "feat: repository subcollection + collection CRUD, autonumber"
```

---

## Phase D — UI

### Task D.1: NameModal (reusable)

**Files:** Create `src/components/NameModal.tsx`.

- [ ] **Step 1: Create `src/components/NameModal.tsx`**
```tsx
import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

export function NameModal({ title, label, initial = '', submitLabel = 'Salvar', onSubmit, onClose }: {
  title: string; label: string; initial?: string; submitLabel?: string
  onSubmit: (name: string) => Promise<void> | void; onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await onSubmit(name.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-sm rounded bg-surface-dim border border-surface-bright p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-on-variant hover:text-on-surface"><X /></button>
        </div>
        <label className="block text-sm text-on-variant">{label}</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded bg-surface border border-surface-bright px-3 py-2 text-sm text-on-surface" />
        <button disabled={busy || !name.trim()} className="w-full rounded bg-on-surface text-surface py-2 text-sm font-medium disabled:opacity-40">
          {busy ? 'Salvando…' : submitLabel}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/NameModal.tsx
git commit -m "feat: reusable name modal"
```

### Task D.2: StyleTabs

**Files:** Create `src/components/StyleTabs.tsx`.

- [ ] **Step 1: Create `src/components/StyleTabs.tsx`**
```tsx
import { NavLink } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import type { Collection, Subcollection } from '../lib/catalog/types'

interface Props {
  collection: Collection
  subcollections: Subcollection[]
  activeStyleSlug: string | null
  onCreateStyle: () => void
  onRenameStyle: (s: Subcollection) => void
}

export function StyleTabs({ collection, subcollections, activeStyleSlug, onCreateStyle, onRenameStyle }: Props) {
  const tabClass = (active: boolean) =>
    `rounded px-3 py-1 text-sm transition-colors ${active ? 'bg-on-surface text-surface' : 'text-on-variant hover:text-on-surface'}`
  const active = subcollections.find((s) => s.slug === activeStyleSlug) ?? null

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <NavLink to={`/${collection.slug}`} end className={() => tabClass(activeStyleSlug === null)}>Geral</NavLink>
      {subcollections.map((s) => (
        <NavLink key={s.id} to={`/${collection.slug}/${s.slug}`} className={() => tabClass(activeStyleSlug === s.slug)}>
          {s.name}
        </NavLink>
      ))}
      {active && (
        <button onClick={() => onRenameStyle(active)} aria-label="Renomear estilo"
          className="grid place-items-center rounded w-7 h-7 text-on-variant hover:text-on-surface"><Pencil size={14} /></button>
      )}
      <button onClick={onCreateStyle} aria-label="Novo estilo"
        className="flex items-center gap-1 rounded px-2 py-1 text-sm text-on-variant hover:text-on-surface">
        <Plus size={14} /> estilo
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/StyleTabs.tsx
git commit -m "feat: style tabs"
```

### Task D.3: TopNavBar — dynamic collections + new collection

**Files:** Modify `src/components/TopNavBar.tsx`.

- [ ] **Step 1: Replace the whole file** with a version that adds a "Nova coleção" button:
```tsx
import { NavLink } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'

interface Props {
  collections: { slug: string; name: string }[]
  query: string
  onQuery: (v: string) => void
  onAdd: () => void
  onNewCollection: () => void
}

export function TopNavBar({ collections, query, onQuery, onAdd, onNewCollection }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-surface-bright/40">
      <div className="mx-auto max-w-studio px-10 h-16 flex items-center gap-8">
        <span className="font-sans font-medium text-lg tracking-tight">Studio</span>
        <nav className="flex gap-6 items-center">
          {collections.map((c) => (
            <NavLink key={c.slug} to={`/${c.slug}`}
              className={({ isActive }) =>
                `pb-1 border-b-2 transition-colors ${isActive ? 'border-on-surface text-on-surface' : 'border-transparent text-on-variant hover:text-on-surface'}`}>
              {c.name}
            </NavLink>
          ))}
          <button onClick={onNewCollection} aria-label="Nova coleção"
            className="flex items-center gap-1 text-sm text-on-variant hover:text-on-surface">
            <Plus size={14} /> coleção
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 rounded bg-surface-dim border border-surface-bright px-3 py-1.5">
            <Search size={16} className="text-on-variant" />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar…"
              className="bg-transparent text-sm outline-none text-on-surface placeholder:text-on-variant w-40" />
          </div>
          <button onClick={onAdd} aria-label="Adicionar card"
            className="grid place-items-center rounded bg-on-surface text-surface w-9 h-9 hover:opacity-90">
            <Plus size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/TopNavBar.tsx
git commit -m "feat: nav with new-collection action"
```

### Task D.4: AddFlow — style target + CSV aspect ratio

**Files:** Modify `src/components/AddFlow.tsx`.

- [ ] **Step 1: Replace the whole file** with a style-aware version:
```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import type { AspectRatio, NewCard, Subcollection } from '../lib/catalog/types'
import { parseCardsCsv } from '../lib/catalog/csv'
import { createCards } from '../lib/catalog/repository'

const RATIOS: AspectRatio[] = ['1:1', '9:16', '3:4']

export function AddFlow({ collectionName, subcollections, defaultSubId, onClose, onAdded }: {
  collectionName: string
  subcollections: Subcollection[]
  defaultSubId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')
  const [busy, setBusy] = useState(false)
  const [targetSub, setTargetSub] = useState(defaultSubId)
  // manual
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [ratio, setRatio] = useState<AspectRatio>('9:16')
  const [tags, setTags] = useState('')
  // csv
  const [csvRatio, setCsvRatio] = useState<AspectRatio>('9:16')
  const [preview, setPreview] = useState<NewCard[]>([])
  const [errors, setErrors] = useState<string[]>([])

  async function onCsv(file: File | undefined) {
    if (!file) return
    const res = parseCardsCsv(await file.text())
    setPreview(res.rows); setErrors(res.errors)
  }

  async function submit() {
    setBusy(true)
    const rows: NewCard[] = mode === 'manual'
      ? [{ number, name, aspectRatio: ratio, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }]
      : preview.map((r) => ({ ...r, aspectRatio: csvRatio }))
    await createCards(targetSub, rows)
    setBusy(false); onAdded()
  }

  const canSubmit = mode === 'manual' ? name.trim() !== '' : preview.length > 0

  return (
    <div className="fixed inset-0 z-30 grid place-items-center p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded bg-surface-dim border border-surface-bright p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Adicionar a {collectionName}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-on-variant hover:text-on-surface"><X /></button>
        </div>

        {subcollections.length > 1 && (
          <label className="block text-sm text-on-variant">
            Estilo de destino
            <select value={targetSub} onChange={(e) => setTargetSub(e.target.value)}
              className="mt-1 w-full rounded bg-surface border border-surface-bright px-2 py-2 text-sm text-on-surface">
              {subcollections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}

        <div className="flex gap-2 text-sm">
          {(['manual', 'csv'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded px-3 py-1 ${mode === m ? 'bg-on-surface text-surface' : 'text-on-variant'}`}>
              {m === 'manual' ? 'Manual' : 'Importar CSV'}
            </button>
          ))}
        </div>

        {mode === 'manual' ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número (vazio = próximo)"
                className="w-44 rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome"
                className="flex-1 rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)}
                className="rounded bg-surface border border-surface-bright px-2 py-2 text-sm">
                {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, por vírgula"
                className="flex-1 rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
            </div>
            <p className="text-xs text-on-variant">Número vazio recebe o próximo disponível no estilo. Imagem você envia depois pelo card.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="file" accept=".csv,text/csv" onChange={(e) => onCsv(e.target.files?.[0])}
              className="block w-full text-sm text-on-variant" />
            <label className="flex items-center gap-2 text-sm text-on-variant">
              Proporção dos cards
              <select value={csvRatio} onChange={(e) => setCsvRatio(e.target.value as AspectRatio)}
                className="rounded bg-surface border border-surface-bright px-2 py-1 text-sm text-on-surface">
                {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <p className="text-xs text-on-variant">Formato: <code>number,name,tags</code> (tags por <code>;</code>). Número pode ficar vazio.</p>
            {errors.length > 0 && <p className="text-xs text-red-400">{errors.length} linha(s) ignorada(s) (sem nome).</p>}
            {preview.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border border-surface-bright text-sm">
                {preview.map((r, i) => (
                  <div key={i} className="flex justify-between px-3 py-1 border-b border-surface-bright/40">
                    <span>{r.number || '—'} {r.name}</span>
                    <span className="text-on-variant">{r.tags.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button disabled={busy || !canSubmit} onClick={submit}
          className="w-full rounded bg-on-surface text-surface py-2 text-sm font-medium disabled:opacity-40">
          {busy ? 'Adicionando…' : mode === 'csv' ? `Adicionar ${preview.length} card(s)` : 'Adicionar card'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/AddFlow.tsx
git commit -m "feat: add flow with style target + CSV aspect ratio"
```

### Task D.5: CollectionPage — scope logic + StyleTabs + modals

**Files:** Modify `src/pages/CollectionPage.tsx` (full replace).

- [ ] **Step 1: Replace the whole file**
```tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopNavBar } from '../components/TopNavBar'
import { CollectionGrid } from '../components/CollectionGrid'
import { ProgressBar } from '../components/ProgressBar'
import { CardModal } from '../components/CardModal'
import { AddFlow } from '../components/AddFlow'
import { StyleTabs } from '../components/StyleTabs'
import { NameModal } from '../components/NameModal'
import { collectionProgress, filterCards } from '../lib/catalog/derive'
import {
  createCollection, createSubcollection, getCollectionBySlug, listCardsByCollection,
  listCardsBySubcollection, listCollections, listSubcollections, renameSubcollection,
} from '../lib/catalog/repository'
import type { Card, CardStatus, Collection, Subcollection } from '../lib/catalog/types'

function exportCsv(name: string, cards: Card[]) {
  const header = 'number,name,aspect_ratio,status,tags,image_url'
  const body = cards.map((c) =>
    [c.number, c.name, c.aspectRatio, c.status, c.tags.join(';'), c.imagePath ?? ''].join(',')).join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name.toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function CollectionPage() {
  const { slug = 'pokemon', style } = useParams()
  const navigate = useNavigate()
  const [collections, setCollections] = useState<Collection[]>([])
  const [collection, setCollection] = useState<Collection | null>(null)
  const [subs, setSubs] = useState<Subcollection[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CardStatus | 'all'>('all')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [active, setActive] = useState<Card | null>(null)
  const [adding, setAdding] = useState(false)
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)
  const [newStyleOpen, setNewStyleOpen] = useState(false)
  const [renaming, setRenaming] = useState<Subcollection | null>(null)

  const activeStyle = useMemo(() => subs.find((s) => s.slug === style) ?? null, [subs, style])

  useEffect(() => { listCollections().then(setCollections) }, [])

  async function loadCards(col: Collection, styleSub: Subcollection | null) {
    setLoading(true)
    setCards(styleSub ? await listCardsBySubcollection(styleSub.id) : await listCardsByCollection(col.id))
    setLoading(false)
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    getCollectionBySlug(slug).then(async (col) => {
      if (!alive || !col) return
      setCollection(col)
      const s = await listSubcollections(col.id)
      if (!alive) return
      setSubs(s)
      const styleSub = style ? s.find((x) => x.slug === style) ?? null : null
      const list = styleSub ? await listCardsBySubcollection(styleSub.id) : await listCardsByCollection(col.id)
      if (alive) { setCards(list); setLoading(false) }
    })
    return () => { alive = false }
  }, [slug, style])

  const visible = useMemo(() => filterCards(cards, { query, status: statusFilter }), [cards, query, statusFilter])
  const progress = useMemo(() => collectionProgress(cards), [cards])

  // Add target: active style, else first style
  const defaultSubId = activeStyle?.id ?? subs[0]?.id ?? ''

  return (
    <div className="min-h-screen">
      <TopNavBar collections={collections} query={query} onQuery={setQuery}
        onAdd={() => setAdding(true)} onNewCollection={() => setNewCollectionOpen(true)} />
      <main className="mx-auto max-w-studio px-10 py-8">
        {collection && subs.length > 1 && (
          <StyleTabs collection={collection} subcollections={subs} activeStyleSlug={style ?? null}
            onCreateStyle={() => setNewStyleOpen(true)} onRenameStyle={(s) => setRenaming(s)} />
        )}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <ProgressBar filled={progress.filled} total={progress.total} />
          <div className="flex items-center gap-2 text-sm">
            {(['all', 'empty', 'filled'] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`rounded px-3 py-1 ${statusFilter === s ? 'bg-on-surface text-surface' : 'text-on-variant hover:text-on-surface'}`}>
                {s === 'all' ? 'Todos' : s === 'empty' ? 'Vazios' : 'Preenchidos'}
              </button>
            ))}
            <button onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              className="rounded px-3 py-1 text-on-variant hover:text-on-surface">
              {density === 'comfortable' ? 'Compacto' : 'Confortável'}
            </button>
            <button onClick={() => collection && exportCsv(collection.name, cards)}
              className="rounded px-3 py-1 text-on-variant hover:text-on-surface">Exportar</button>
          </div>
        </div>
        <CollectionGrid cards={visible} loading={loading} density={density} onOpen={setActive} />
      </main>

      {active && (
        <CardModal card={active} onClose={() => setActive(null)}
          onChanged={() => { if (collection) loadCards(collection, activeStyle) }} />
      )}
      {adding && collection && defaultSubId && (
        <AddFlow collectionName={collection.name} subcollections={subs} defaultSubId={defaultSubId}
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); if (collection) loadCards(collection, activeStyle) }} />
      )}
      {newCollectionOpen && (
        <NameModal title="Nova coleção" label="Nome da coleção" submitLabel="Criar"
          onClose={() => setNewCollectionOpen(false)}
          onSubmit={async (name) => {
            const col = await createCollection(name)
            setCollections(await listCollections())
            setNewCollectionOpen(false)
            navigate(`/${col.slug}`)
          }} />
      )}
      {newStyleOpen && collection && (
        <NameModal title="Novo estilo" label="Nome do estilo" submitLabel="Criar"
          onClose={() => setNewStyleOpen(false)}
          onSubmit={async (name) => {
            const created = await createSubcollection(collection.id, name)
            setSubs(await listSubcollections(collection.id))
            setNewStyleOpen(false)
            navigate(`/${collection.slug}/${created.slug}`)
          }} />
      )}
      {renaming && collection && (
        <NameModal title="Renomear estilo" label="Novo nome" initial={renaming.name} submitLabel="Salvar"
          onClose={() => setRenaming(null)}
          onSubmit={async (name) => {
            await renameSubcollection(renaming.id, name)
            setSubs(await listSubcollections(collection.id))
            setRenaming(null)
          }} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/pages/CollectionPage.tsx
git commit -m "feat: collection page with styles, scope, management modals"
```

### Task D.6: Router — style route

**Files:** Modify `src/main.tsx`.

- [ ] **Step 1: Add the `/:collection/:style` route** — in the `<Routes>` block, add a line after the `/:slug` route:
```tsx
      <Route path="/" element={<Navigate to="/pokemon" replace />} />
      <Route path="/:slug" element={<CollectionPage />} />
      <Route path="/:slug/:style" element={<CollectionPage />} />
      <Route path="*" element={<Navigate to="/pokemon" replace />} />
```

- [ ] **Step 2: Commit**
```bash
git add src/main.tsx
git commit -m "feat: style route"
```

---

## Phase E — Verify

### Task E.1: Build + tests + manual

- [ ] **Step 1: Type-check + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS (csv 4, derive 3, numbering 7).

- [ ] **Step 3: Manual smoke (owner, after migration A.1 applied)**

Run: `npm run dev`. Confirm:
- `/pokemon` shows 151 cards, no style tabs yet (single "Padrão" style).
- `+` (add card) → manual with empty number assigns "152"; CSV import with a ratio applies it.
- "＋ coleção" creates a new collection → navigates to it (empty).
- In Pokémon, "+ estilo" creates "Estilo A" → style tabs appear: Geral / Padrão / Estilo A.
- Add a card to Estilo A → it shows under Estilo A and under Geral (which now aggregates).
- Rename "Estilo A" via the pencil → name updates in tabs.

- [ ] **Step 4: No commit needed (verification only).**

---

## Self-Review notes

- **Spec coverage:** custom collections (createCollection + TopNavBar + NameModal, D.3/D.5) · subcollections table + migration of 151 to "Padrão" (A.1) · aggregate "Geral" vs style view (CollectionPage scope + StyleTabs, D.2/D.5) · ≥1 style per collection / auto "Padrão" (createCollection + migration) · auto-numbering manual+CSV (numbering.ts B.1, createCards C.3, AddFlow D.4) · CSV aspect ratio (AddFlow D.4) · rename style (renameSubcollection C.3, D.5) · delete deferred (per spec). All covered.
- **Type consistency:** `Subcollection`/`Card.subcollectionId`/optional `NewCard.number` defined in C.1 and used consistently. Repository names (`listCardsByCollection`, `listCardsBySubcollection`, `listSubcollections`, `createCollection`, `createSubcollection`, `renameSubcollection`, `createCards(subcollectionId, …)`) match all call sites in CollectionPage/AddFlow. Old `listCards`/`createCards(collectionId,…)` fully replaced.
- **No placeholders:** every step has complete code. The Phase C.3 type-check intentionally surfaces transient errors in CollectionPage/AddFlow, resolved within Phase D.
