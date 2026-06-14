# Collection Studio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the functional base of a personal, PWA-installable collection studio (Supabase backend + isolated repository layer + React/Tailwind front-end), seeded with the original 151 Pokémon.

**Architecture:** React 19 + Vite + TypeScript SPA. All Supabase access (Postgres, Storage, Auth) lives behind a repository module in `src/lib/catalog/`; components never touch Supabase directly. Postgres holds card metadata, a public Storage bucket holds images, Supabase Auth + RLS restrict reads/writes to the single owner.

**Tech Stack:** React 19, Vite 8, TypeScript, Tailwind CSS, Framer Motion, Lucide React, React Router, `vite-plugin-pwa`, `@supabase/supabase-js`, Vitest + Testing Library, `browser-image-compression`.

**Spec:** [docs/superpowers/specs/2026-06-14-collection-studio-design.md](../specs/2026-06-14-collection-studio-design.md)

---

## File Structure

**Created:**
- `.env.local`, `.env.example` — Supabase env vars
- `tailwind.config.js`, `postcss.config.js` — Tailwind
- `vitest.config.ts`, `src/test/setup.ts` — test harness
- `supabase/migrations/0001_schema.sql` — tables + RLS + bucket
- `src/lib/supabase.ts` — Supabase client singleton
- `src/lib/catalog/types.ts` — domain types
- `src/lib/catalog/kanto.ts` — 151 Pokémon seed data
- `src/lib/catalog/image.ts` — client-side image compression
- `src/lib/catalog/csv.ts` — CSV parsing (pure, TDD)
- `src/lib/catalog/derive.ts` — status/progress/filter helpers (pure, TDD)
- `src/lib/catalog/repository.ts` — Supabase data access
- `scripts/seed.mjs` — one-off seed script
- `src/auth/AuthProvider.tsx`, `src/auth/LoginScreen.tsx` — auth
- `src/components/TopNavBar.tsx`, `Card.tsx`, `CollectionGrid.tsx`, `CardModal.tsx`, `AddFlow.tsx`, `Skeleton.tsx`, `ProgressBar.tsx`
- `src/pages/CollectionPage.tsx`
- `src/styles/tokens.css` — design-system CSS variables
- `public/manifest.webmanifest`, PWA icons

**Modified:**
- `package.json` (deps + scripts), `vite.config.ts` (PWA plugin), `index.html` (fonts, title), `src/main.tsx` (router + providers), `src/index.css` (Tailwind + tokens)

**Deleted:** `src/App.tsx`, `src/App.css`, `src/assets/*` template files (replaced by real app).

---

## Phase 0 — Project setup

### Task 0.1: Install dependencies

- [ ] **Step 1: Install runtime + dev deps**

Run:
```bash
npm install @supabase/supabase-js react-router-dom framer-motion lucide-react browser-image-compression
npm install -D tailwindcss@^3 postcss autoprefixer vite-plugin-pwa vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Expected: installs succeed, `package.json` updated.

- [ ] **Step 2: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: add project dependencies"
```

### Task 0.2: Configure Tailwind + design tokens

**Files:** Create `tailwind.config.js`, `postcss.config.js`, `src/styles/tokens.css`; Modify `src/index.css`.

- [ ] **Step 1: Create `tailwind.config.js`**
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#131313', dim: '#0e0e0e', bright: '#3a3939' },
        on: { surface: '#FFFFFF', variant: '#A1A1A1' },
      },
      borderRadius: { DEFAULT: '4px' },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { studio: '1600px' },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Create `postcss.config.js`**
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

- [ ] **Step 3: Create `src/styles/tokens.css`**
```css
:root {
  --surface: #131313;
  --surface-dim: #0e0e0e;
  --surface-bright: #3a3939;
  --on-surface: #ffffff;
  --on-surface-variant: #a1a1a1;
  --radius: 4px;
  --margin-x: 40px;
  --backdrop: rgba(0, 0, 0, 0.85);
}
```

- [ ] **Step 4: Replace `src/index.css`**
```css
@import './styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--surface);
  color: var(--on-surface);
  font-family: Inter, system-ui, sans-serif;
}
```

- [ ] **Step 5: Add fonts + title in `index.html`** — inside `<head>`, replace `<title>` line and add fonts:
```html
    <title>Studio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 6: Verify build compiles**

Run: `npm run dev` (Ctrl-C after it boots). Expected: dev server starts with no Tailwind/PostCSS errors.

- [ ] **Step 7: Commit**
```bash
git add tailwind.config.js postcss.config.js src/styles/tokens.css src/index.css index.html
git commit -m "feat: tailwind + design-system tokens"
```

### Task 0.3: Configure Vitest

**Files:** Create `vitest.config.ts`, `src/test/setup.ts`; Modify `package.json`.

- [ ] **Step 1: Create `vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 2: Create `src/test/setup.ts`**
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Add test scripts to `package.json`** — in `"scripts"`:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Smoke test the harness** — create `src/test/smoke.test.ts`:
```ts
import { expect, test } from 'vitest'
test('vitest runs', () => { expect(1 + 1).toBe(2) })
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 6: Delete smoke test and commit**
```bash
rm src/test/smoke.test.ts
git add vitest.config.ts src/test/setup.ts package.json
git commit -m "chore: vitest harness"
```

---

## Phase 1 — Supabase backend (manual + SQL)

### Task 1.1: Create Supabase project (manual, owner)

- [ ] **Step 1:** At https://supabase.com create a free project. Note the **Project URL**, **anon public key**, and **service_role key** (Settings → API).
- [ ] **Step 2:** Authentication → Providers → Email: enable. Authentication → Users → "Add user" with the owner email + a password (single-user app; sign-up stays disabled).
- [ ] **Step 3:** Record the three values; they feed `.env.local` (Task 1.3) and Vercel env vars.

### Task 1.2: Schema, RLS, and storage bucket

**Files:** Create `supabase/migrations/0001_schema.sql`.

- [ ] **Step 1: Write the migration**
```sql
-- Collections
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Cards
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  number text not null,
  name text not null,
  image_path text,
  aspect_ratio text not null default '3:4' check (aspect_ratio in ('1:1','9:16','3:4')),
  tags text[] not null default '{}',
  status text not null default 'empty' check (status in ('empty','filled')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_collection_idx on public.cards(collection_id, sort_order);

-- Keep status + updated_at in sync with image_path
create or replace function public.cards_sync() returns trigger as $$
begin
  new.status := case when new.image_path is null or new.image_path = '' then 'empty' else 'filled' end;
  new.updated_at := now();
  return new;
end; $$ language plpgsql;

create trigger cards_sync_trg before insert or update on public.cards
  for each row execute function public.cards_sync();

-- RLS: only authenticated users (the owner) can read/write
alter table public.collections enable row level security;
alter table public.cards enable row level security;

create policy "auth read collections" on public.collections for select to authenticated using (true);
create policy "auth write collections" on public.collections for all to authenticated using (true) with check (true);
create policy "auth read cards" on public.cards for select to authenticated using (true);
create policy "auth write cards" on public.cards for all to authenticated using (true) with check (true);

-- Seed collections
insert into public.collections (slug, name, sort_order) values
  ('pokemon', 'Pokémon', 0),
  ('naruto', 'Naruto', 1);

-- Public storage bucket for images (read public, write via authenticated session)
insert into storage.buckets (id, name, public) values ('card-images', 'card-images', true)
  on conflict (id) do nothing;

create policy "public read card-images" on storage.objects for select using (bucket_id = 'card-images');
create policy "auth write card-images" on storage.objects for insert to authenticated with check (bucket_id = 'card-images');
create policy "auth update card-images" on storage.objects for update to authenticated using (bucket_id = 'card-images');
create policy "auth delete card-images" on storage.objects for delete to authenticated using (bucket_id = 'card-images');
```

- [ ] **Step 2: Apply it (owner)** — paste the file contents into Supabase → SQL Editor → Run.
Expected: "Success. No rows returned." Verify tables exist under Table Editor and the `card-images` bucket under Storage.

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/0001_schema.sql
git commit -m "feat: supabase schema, RLS, storage bucket"
```

### Task 1.3: Environment variables

**Files:** Create `.env.local`, `.env.example`; verify `.gitignore`.

- [ ] **Step 1: Confirm `.env.local` is git-ignored** — check `.gitignore` contains a line matching `.env` (Vite's template includes `*.local`). If `.env.local` is not ignored, add `.env.local` to `.gitignore`.

- [ ] **Step 2: Create `.env.example`**
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# Only used locally by scripts/seed.mjs — never commit the real value
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 3: Create `.env.local`** with the real values from Task 1.1 (owner fills in).

- [ ] **Step 4: Commit example only**
```bash
git add .env.example .gitignore
git commit -m "chore: env var template"
```

---

## Phase 2 — Repository layer (TDD for pure logic)

### Task 2.1: Domain types

**Files:** Create `src/lib/catalog/types.ts`.

- [ ] **Step 1: Write types**
```ts
export type AspectRatio = '1:1' | '9:16' | '3:4'
export type CardStatus = 'empty' | 'filled'

export interface Collection {
  id: string
  slug: string
  name: string
  sortOrder: number
}

export interface Card {
  id: string
  collectionId: string
  number: string
  name: string
  imagePath: string | null
  aspectRatio: AspectRatio
  tags: string[]
  status: CardStatus
  sortOrder: number
}

/** A new card before it exists in the DB (used by AddFlow + seed). */
export interface NewCard {
  number: string
  name: string
  aspectRatio: AspectRatio
  tags: string[]
}
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/catalog/types.ts
git commit -m "feat: catalog domain types"
```

### Task 2.2: CSV parsing (pure, TDD)

**Files:** Create `src/lib/catalog/csv.ts`; Test `src/lib/catalog/csv.test.ts`.

CSV format: header row `number,name,tags` (tags column optional, semicolon-separated inside the cell). `aspectRatio` defaults to `3:4`.

- [ ] **Step 1: Write failing tests**
```ts
import { describe, expect, it } from 'vitest'
import { parseCardsCsv } from './csv'

describe('parseCardsCsv', () => {
  it('parses number, name and semicolon tags', () => {
    const csv = 'number,name,tags\n006,Charizard,fire;flying\n025,Pikachu,electric'
    expect(parseCardsCsv(csv)).toEqual({
      rows: [
        { number: '006', name: 'Charizard', aspectRatio: '3:4', tags: ['fire', 'flying'] },
        { number: '025', name: 'Pikachu', aspectRatio: '3:4', tags: ['electric'] },
      ],
      errors: [],
    })
  })

  it('tolerates a missing tags column', () => {
    const csv = 'number,name\n001,Bulbasaur'
    expect(parseCardsCsv(csv).rows[0]).toEqual({
      number: '001', name: 'Bulbasaur', aspectRatio: '3:4', tags: [],
    })
  })

  it('reports rows missing required fields and skips them', () => {
    const csv = 'number,name\n,NoNumber\n007,'
    const out = parseCardsCsv(csv)
    expect(out.rows).toEqual([])
    expect(out.errors).toHaveLength(2)
  })

  it('errors on missing required headers', () => {
    const out = parseCardsCsv('foo,bar\n1,2')
    expect(out.rows).toEqual([])
    expect(out.errors[0]).toMatch(/header/i)
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/lib/catalog/csv.test.ts`
Expected: FAIL ("parseCardsCsv is not a function").

- [ ] **Step 3: Implement `csv.ts`**
```ts
import type { NewCard } from './types'

export interface CsvParseResult {
  rows: NewCard[]
  errors: string[]
}

export function parseCardsCsv(text: string): CsvParseResult {
  const errors: string[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { rows: [], errors: ['CSV is empty'] }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const numIdx = header.indexOf('number')
  const nameIdx = header.indexOf('name')
  const tagsIdx = header.indexOf('tags')
  if (numIdx === -1 || nameIdx === -1) {
    return { rows: [], errors: ['Missing required header: expected "number" and "name"'] }
  }

  const rows: NewCard[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const number = (cols[numIdx] ?? '').trim()
    const name = (cols[nameIdx] ?? '').trim()
    if (!number || !name) {
      errors.push(`Row ${i}: missing number or name`)
      continue
    }
    const rawTags = tagsIdx === -1 ? '' : (cols[tagsIdx] ?? '').trim()
    const tags = rawTags ? rawTags.split(';').map((t) => t.trim()).filter(Boolean) : []
    rows.push({ number, name, aspectRatio: '3:4', tags })
  }
  return { rows, errors }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/lib/catalog/csv.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**
```bash
git add src/lib/catalog/csv.ts src/lib/catalog/csv.test.ts
git commit -m "feat: CSV card parser"
```

### Task 2.3: Derived helpers (pure, TDD)

**Files:** Create `src/lib/catalog/derive.ts`; Test `src/lib/catalog/derive.test.ts`.

- [ ] **Step 1: Write failing tests**
```ts
import { describe, expect, it } from 'vitest'
import { collectionProgress, filterCards } from './derive'
import type { Card } from './types'

const card = (over: Partial<Card>): Card => ({
  id: 'x', collectionId: 'c', number: '001', name: 'Bulbasaur',
  imagePath: null, aspectRatio: '9:16', tags: [], status: 'empty', sortOrder: 0, ...over,
})

describe('collectionProgress', () => {
  it('counts filled vs total', () => {
    const cards = [card({}), card({ status: 'filled' }), card({ status: 'filled' })]
    expect(collectionProgress(cards)).toEqual({ filled: 2, total: 3 })
  })
})

describe('filterCards', () => {
  const cards = [
    card({ number: '006', name: 'Charizard', tags: ['fire'], status: 'filled' }),
    card({ number: '025', name: 'Pikachu', tags: ['electric'], status: 'empty' }),
  ]
  it('filters by status', () => {
    expect(filterCards(cards, { query: '', status: 'empty' })).toHaveLength(1)
    expect(filterCards(cards, { query: '', status: 'filled' })[0].name).toBe('Charizard')
  })
  it('searches name, number and tags case-insensitively', () => {
    expect(filterCards(cards, { query: 'char', status: 'all' })[0].name).toBe('Charizard')
    expect(filterCards(cards, { query: '025', status: 'all' })[0].name).toBe('Pikachu')
    expect(filterCards(cards, { query: 'ELECTRIC', status: 'all' })[0].name).toBe('Pikachu')
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/lib/catalog/derive.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `derive.ts`**
```ts
import type { Card, CardStatus } from './types'

export interface CardFilter {
  query: string
  status: CardStatus | 'all'
}

export function collectionProgress(cards: Card[]): { filled: number; total: number } {
  return { filled: cards.filter((c) => c.status === 'filled').length, total: cards.length }
}

export function filterCards(cards: Card[], filter: CardFilter): Card[] {
  const q = filter.query.trim().toLowerCase()
  return cards.filter((c) => {
    if (filter.status !== 'all' && c.status !== filter.status) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.number.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    )
  })
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/lib/catalog/derive.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**
```bash
git add src/lib/catalog/derive.ts src/lib/catalog/derive.test.ts
git commit -m "feat: progress + filter helpers"
```

### Task 2.4: Supabase client + image compression

**Files:** Create `src/lib/supabase.ts`, `src/lib/catalog/image.ts`.

- [ ] **Step 1: Create `src/lib/supabase.ts`**
```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey)
```

- [ ] **Step 2: Create `src/lib/catalog/image.ts`**
```ts
import imageCompression from 'browser-image-compression'

/** Compress + downscale before upload. Pass optimize=false for max quality. */
export async function prepareImage(file: File, optimize = true): Promise<File> {
  if (!optimize) return file
  return imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1.2,
    fileType: 'image/webp',
    useWebWorker: true,
  })
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add src/lib/supabase.ts src/lib/catalog/image.ts
git commit -m "feat: supabase client + image compression"
```

### Task 2.5: Repository

**Files:** Create `src/lib/catalog/repository.ts`.

Row mappers convert snake_case DB rows ↔ camelCase domain types. Every component-facing data operation lives here.

- [ ] **Step 1: Implement `repository.ts`**
```ts
import { supabase } from '../supabase'
import { prepareImage } from './image'
import type { AspectRatio, Card, Collection, NewCard } from './types'

const BUCKET = 'card-images'

interface CardRow {
  id: string
  collection_id: string
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
    number: r.number,
    name: r.name,
    imagePath: r.image_path,
    aspectRatio: r.aspect_ratio,
    tags: r.tags ?? [],
    status: r.status,
    sortOrder: r.sort_order,
  }
}

export function imageUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function listCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections').select('*').order('sort_order')
  if (error) throw error
  return data.map((c) => ({ id: c.id, slug: c.slug, name: c.name, sortOrder: c.sort_order }))
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const { data, error } = await supabase
    .from('collections').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? { id: data.id, slug: data.slug, name: data.name, sortOrder: data.sort_order } : null
}

export async function listCards(collectionId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards').select('*').eq('collection_id', collectionId).order('sort_order')
  if (error) throw error
  return (data as CardRow[]).map(toCard)
}

export async function createCards(collectionId: string, cards: NewCard[]): Promise<void> {
  if (cards.length === 0) return
  const rows = cards.map((c, i) => ({
    collection_id: collectionId,
    number: c.number,
    name: c.name,
    aspect_ratio: c.aspectRatio,
    tags: c.tags,
    sort_order: i,
  }))
  const { error } = await supabase.from('cards').insert(rows)
  if (error) throw error
}

export async function updateCard(
  id: string,
  patch: Partial<Pick<Card, 'name' | 'number' | 'aspectRatio' | 'tags'>>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.number !== undefined) dbPatch.number = patch.number
  if (patch.aspectRatio !== undefined) dbPatch.aspect_ratio = patch.aspectRatio
  if (patch.tags !== undefined) dbPatch.tags = patch.tags
  const { error } = await supabase.from('cards').update(dbPatch).eq('id', id)
  if (error) throw error
}

export async function uploadCardImage(card: Card, file: File, optimize = true): Promise<void> {
  const prepared = await prepareImage(file, optimize)
  const ext = optimize ? 'webp' : (file.name.split('.').pop() || 'png')
  const path = `${card.collectionId}/${card.id}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET).upload(path, prepared, { upsert: true, contentType: prepared.type })
  if (upErr) throw upErr
  const { error } = await supabase.from('cards').update({ image_path: path }).eq('id', card.id)
  if (error) throw error
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add src/lib/catalog/repository.ts
git commit -m "feat: catalog repository (Supabase data access)"
```

### Task 2.6: Pokémon seed data + seed script

**Files:** Create `src/lib/catalog/kanto.ts`, `scripts/seed.mjs`; Modify `package.json`.

- [ ] **Step 1: Create `src/lib/catalog/kanto.ts`** (used by the seed script; numbers zero-padded to 3 digits)
```ts
import type { NewCard } from './types'

const NAMES = [
  'Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle',
  'Blastoise','Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto',
  'Pidgeot','Rattata','Raticate','Spearow','Fearow','Ekans','Arbok','Pikachu','Raichu','Sandshrew',
  'Sandslash','Nidoran♀','Nidorina','Nidoqueen','Nidoran♂','Nidorino','Nidoking','Clefairy','Clefable',
  'Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat','Golbat','Oddish','Gloom','Vileplume','Paras',
  'Parasect','Venonat','Venomoth','Diglett','Dugtrio','Meowth','Persian','Psyduck','Golduck','Mankey',
  'Primeape','Growlithe','Arcanine','Poliwag','Poliwhirl','Poliwrath','Abra','Kadabra','Alakazam',
  'Machop','Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool','Tentacruel','Geodude',
  'Graveler','Golem','Ponyta','Rapidash','Slowpoke','Slowbro','Magnemite','Magneton',"Farfetch'd",
  'Doduo','Dodrio','Seel','Dewgong','Grimer','Muk','Shellder','Cloyster','Gastly','Haunter','Gengar',
  'Onix','Drowzee','Hypno','Krabby','Kingler','Voltorb','Electrode','Exeggcute','Exeggutor','Cubone',
  'Marowak','Hitmonlee','Hitmonchan','Lickitung','Koffing','Weezing','Rhyhorn','Rhydon','Chansey',
  'Tangela','Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu','Starmie','Mr. Mime','Scyther',
  'Jynx','Electabuzz','Magmar','Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto','Eevee',
  'Vaporeon','Jolteon','Flareon','Porygon','Omanyte','Omastar','Kabuto','Kabutops','Aerodactyl',
  'Snorlax','Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew',
]

export const KANTO_151: NewCard[] = NAMES.map((name, i) => ({
  number: String(i + 1).padStart(3, '0'),
  name,
  aspectRatio: '9:16',
  tags: [],
}))
```

- [ ] **Step 2: Create `scripts/seed.mjs`** (run locally with the service-role key; inserts the 151 only if the Pokémon collection has no cards)
```js
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Minimal .env.local loader (no extra deps)
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const NAMES = [
  'Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle',
  'Blastoise','Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto',
  'Pidgeot','Rattata','Raticate','Spearow','Fearow','Ekans','Arbok','Pikachu','Raichu','Sandshrew',
  'Sandslash','Nidoran♀','Nidorina','Nidoqueen','Nidoran♂','Nidorino','Nidoking','Clefairy','Clefable',
  'Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat','Golbat','Oddish','Gloom','Vileplume','Paras',
  'Parasect','Venonat','Venomoth','Diglett','Dugtrio','Meowth','Persian','Psyduck','Golduck','Mankey',
  'Primeape','Growlithe','Arcanine','Poliwag','Poliwhirl','Poliwrath','Abra','Kadabra','Alakazam',
  'Machop','Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool','Tentacruel','Geodude',
  'Graveler','Golem','Ponyta','Rapidash','Slowpoke','Slowbro','Magnemite','Magneton',"Farfetch'd",
  'Doduo','Dodrio','Seel','Dewgong','Grimer','Muk','Shellder','Cloyster','Gastly','Haunter','Gengar',
  'Onix','Drowzee','Hypno','Krabby','Kingler','Voltorb','Electrode','Exeggcute','Exeggutor','Cubone',
  'Marowak','Hitmonlee','Hitmonchan','Lickitung','Koffing','Weezing','Rhyhorn','Rhydon','Chansey',
  'Tangela','Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu','Starmie','Mr. Mime','Scyther',
  'Jynx','Electabuzz','Magmar','Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto','Eevee',
  'Vaporeon','Jolteon','Flareon','Porygon','Omanyte','Omastar','Kabuto','Kabutops','Aerodactyl',
  'Snorlax','Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew',
]

const { data: col, error: colErr } = await supabase
  .from('collections').select('id').eq('slug', 'pokemon').single()
if (colErr) throw colErr

const { count } = await supabase
  .from('cards').select('id', { count: 'exact', head: true }).eq('collection_id', col.id)
if (count && count > 0) { console.log(`Pokémon already seeded (${count} cards). Skipping.`); process.exit(0) }

const rows = NAMES.map((name, i) => ({
  collection_id: col.id,
  number: String(i + 1).padStart(3, '0'),
  name,
  aspect_ratio: '9:16',
  sort_order: i,
}))

const { error } = await supabase.from('cards').insert(rows)
if (error) throw error
console.log(`Seeded ${rows.length} Pokémon.`)
```

- [ ] **Step 3: Add seed script to `package.json`** — in `"scripts"`:
```json
    "seed": "node scripts/seed.mjs"
```

- [ ] **Step 4: Run the seed (owner, after Task 1.2 applied)**

Run: `npm run seed`
Expected: `Seeded 151 Pokémon.` Re-running prints the "already seeded" skip message. Verify 151 rows in Supabase Table Editor → cards.

- [ ] **Step 5: Commit**
```bash
git add src/lib/catalog/kanto.ts scripts/seed.mjs package.json
git commit -m "feat: 151 Pokémon seed data + script"
```

---

## Phase 3 — Auth + shell + routing

### Task 3.1: Auth provider + login screen

**Files:** Create `src/auth/AuthProvider.tsx`, `src/auth/LoginScreen.tsx`.

- [ ] **Step 1: Create `src/auth/AuthProvider.tsx`**
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState { session: Session | null; loading: boolean }
const AuthContext = createContext<AuthState>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 2: Create `src/auth/LoginScreen.tsx`**
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-3xl">Studio</h1>
        <input className="w-full rounded bg-surface-dim border border-surface-bright px-3 py-2 text-on-surface"
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded bg-surface-dim border border-surface-bright px-3 py-2 text-on-surface"
          type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-on-surface text-surface py-2 font-medium disabled:opacity-50">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add src/auth/AuthProvider.tsx src/auth/LoginScreen.tsx
git commit -m "feat: auth provider + login screen"
```

### Task 3.2: Skeleton + ProgressBar primitives

**Files:** Create `src/components/Skeleton.tsx`, `src/components/ProgressBar.tsx`.

- [ ] **Step 1: Create `src/components/Skeleton.tsx`**
```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-bright/40 ${className}`} />
}
```

- [ ] **Step 2: Create `src/components/ProgressBar.tsx`**
```tsx
export function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
  return (
    <div className="flex items-center gap-3 text-sm text-on-variant">
      <div className="h-1 w-40 rounded bg-surface-bright/40 overflow-hidden">
        <div className="h-full bg-on-surface transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span>{filled}/{total} preenchidos</span>
    </div>
  )
}
```

> Note: `text-on-variant` maps to color `on.variant`. Tailwind generates `text-on-variant` from the `on: { variant }` config in Task 0.2.

- [ ] **Step 3: Commit**
```bash
git add src/components/Skeleton.tsx src/components/ProgressBar.tsx
git commit -m "feat: skeleton + progress bar"
```

### Task 3.3: TopNavBar

**Files:** Create `src/components/TopNavBar.tsx`.

- [ ] **Step 1: Create `src/components/TopNavBar.tsx`**
```tsx
import { NavLink } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  collections: { slug: string; name: string }[]
  query: string
  onQuery: (v: string) => void
  onAdd: () => void
}

export function TopNavBar({ collections, query, onQuery, onAdd }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-surface-bright/40">
      <div className="mx-auto max-w-studio px-10 h-16 flex items-center gap-8">
        <span className="font-sans font-medium text-lg tracking-tight">Studio</span>
        <nav className="flex gap-6">
          {collections.map((c) => (
            <NavLink key={c.slug} to={`/${c.slug}`}
              className={({ isActive }) =>
                `pb-1 border-b-2 transition-colors ${isActive ? 'border-on-surface text-on-surface' : 'border-transparent text-on-variant hover:text-on-surface'}`}>
              {c.name}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 rounded bg-surface-dim border border-surface-bright px-3 py-1.5">
            <Search size={16} className="text-on-variant" />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar…"
              className="bg-transparent text-sm outline-none text-on-surface placeholder:text-on-variant w-40" />
          </div>
          <button onClick={onAdd} aria-label="Adicionar"
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
git commit -m "feat: top nav bar"
```

### Task 3.4: Router + providers wiring

**Files:** Modify `src/main.tsx`; Delete `src/App.tsx`, `src/App.css`.

- [ ] **Step 1: Replace `src/main.tsx`** (CollectionPage created in Task 4.1; redirect root → /pokemon)
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginScreen } from './auth/LoginScreen'
import { CollectionPage } from './pages/CollectionPage'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-on-variant">Carregando…</div>
  if (!session) return <LoginScreen />
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pokemon" replace />} />
      <Route path="/:slug" element={<CollectionPage />} />
      <Route path="*" element={<Navigate to="/pokemon" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 2: Delete template files**
```bash
rm src/App.tsx src/App.css src/assets/hero.png
```

- [ ] **Step 3: Commit** (build verified at end of Phase 4, once CollectionPage exists)
```bash
git add src/main.tsx src/App.tsx src/App.css src/assets/hero.png
git commit -m "feat: router + auth gate wiring"
```

---

## Phase 4 — Grid, cards, modals, features

### Task 4.1: Card + CollectionGrid + CollectionPage (renders the seeded grid)

**Files:** Create `src/components/Card.tsx`, `src/components/CollectionGrid.tsx`, `src/pages/CollectionPage.tsx`.

Aspect-ratio CSS map (shared): `'1:1' → 'aspect-square'`, `'9:16' → 'aspect-[9/16]'`, `'3:4' → 'aspect-[3/4]'`.

- [ ] **Step 1: Create `src/components/Card.tsx`**
```tsx
import { motion } from 'framer-motion'
import type { Card as CardType } from '../lib/catalog/types'
import { imageUrl } from '../lib/catalog/repository'

const ASPECT: Record<CardType['aspectRatio'], string> = {
  '1:1': 'aspect-square', '9:16': 'aspect-[9/16]', '3:4': 'aspect-[3/4]',
}

export function Card({ card, onOpen }: { card: CardType; onOpen: (c: CardType) => void }) {
  const url = imageUrl(card.imagePath)
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => onOpen(card)}
      className={`group relative w-full overflow-hidden rounded bg-surface-dim ${ASPECT[card.aspectRatio]}`}
    >
      {url ? (
        <img src={url} alt={card.name} loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] group-hover:brightness-110" />
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-surface-bright/60 text-on-variant">
          <span className="font-display text-2xl opacity-40">{card.number}</span>
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
        {card.number} {card.name}
      </span>
    </motion.button>
  )
}
```

- [ ] **Step 2: Create `src/components/CollectionGrid.tsx`**
```tsx
import type { Card as CardType } from '../lib/catalog/types'
import { Card } from './Card'
import { Skeleton } from './Skeleton'

interface Props {
  cards: CardType[]
  loading: boolean
  density: 'comfortable' | 'compact'
  onOpen: (c: CardType) => void
}

const GRID: Record<Props['density'], string> = {
  comfortable: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  compact: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6',
}

export function CollectionGrid({ cards, loading, density, onOpen }: Props) {
  if (loading) {
    return (
      <div className={`grid gap-4 ${GRID[density]}`}>
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[9/16]" />)}
      </div>
    )
  }
  if (cards.length === 0) {
    return <p className="py-20 text-center text-on-variant">Nenhum card. Use o botão + para adicionar.</p>
  }
  return (
    <div className={`grid gap-4 ${GRID[density]}`}>
      {cards.map((c) => <Card key={c.id} card={c} onOpen={onOpen} />)}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/pages/CollectionPage.tsx`** (CardModal + AddFlow wired in Tasks 4.2–4.3; placeholders kept out — this version renders nav, filters, grid)
```tsx
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TopNavBar } from '../components/TopNavBar'
import { CollectionGrid } from '../components/CollectionGrid'
import { ProgressBar } from '../components/ProgressBar'
import { CardModal } from '../components/CardModal'
import { AddFlow } from '../components/AddFlow'
import { collectionProgress, filterCards } from '../lib/catalog/derive'
import { getCollectionBySlug, listCards, listCollections } from '../lib/catalog/repository'
import type { Card, CardStatus, Collection } from '../lib/catalog/types'

export function CollectionPage() {
  const { slug = 'pokemon' } = useParams()
  const [collections, setCollections] = useState<Collection[]>([])
  const [collection, setCollection] = useState<Collection | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CardStatus | 'all'>('all')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [active, setActive] = useState<Card | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => { listCollections().then(setCollections) }, [])

  async function refresh(col: Collection) {
    setLoading(true)
    setCards(await listCards(col.id))
    setLoading(false)
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    getCollectionBySlug(slug).then((col) => {
      if (!alive || !col) return
      setCollection(col)
      listCards(col.id).then((cs) => { if (alive) { setCards(cs); setLoading(false) } })
    })
    return () => { alive = false }
  }, [slug])

  const visible = useMemo(() => filterCards(cards, { query, status: statusFilter }), [cards, query, statusFilter])
  const progress = useMemo(() => collectionProgress(cards), [cards])

  return (
    <div className="min-h-screen">
      <TopNavBar collections={collections} query={query} onQuery={setQuery} onAdd={() => setAdding(true)} />
      <main className="mx-auto max-w-studio px-10 py-8">
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
          </div>
        </div>
        <CollectionGrid cards={visible} loading={loading} density={density} onOpen={setActive} />
      </main>

      {active && (
        <CardModal card={active} onClose={() => setActive(null)}
          onChanged={() => { if (collection) refresh(collection) }} />
      )}
      {adding && collection && (
        <AddFlow collection={collection} onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); refresh(collection) }} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit** (modals added next; build verified at Task 4.4)
```bash
git add src/components/Card.tsx src/components/CollectionGrid.tsx src/pages/CollectionPage.tsx
git commit -m "feat: card, grid, collection page"
```

### Task 4.2: CardModal (view / upload / edit)

**Files:** Create `src/components/CardModal.tsx`.

- [ ] **Step 1: Create `src/components/CardModal.tsx`**
```tsx
import { useRef, useState } from 'react'
import { X, Upload, Trash2 } from 'lucide-react'
import type { AspectRatio, Card } from '../lib/catalog/types'
import { deleteCard, imageUrl, updateCard, uploadCardImage } from '../lib/catalog/repository'

const RATIOS: AspectRatio[] = ['1:1', '9:16', '3:4']

export function CardModal({ card, onClose, onChanged }: {
  card: Card; onClose: () => void; onChanged: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [optimize, setOptimize] = useState(true)
  const [tags, setTags] = useState(card.tags.join(', '))
  const [ratio, setRatio] = useState<AspectRatio>(card.aspectRatio)
  const url = imageUrl(card.imagePath)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    await uploadCardImage(card, file, optimize)
    setBusy(false); onChanged(); onClose()
  }

  async function saveMeta() {
    setBusy(true)
    await updateCard(card.id, { aspectRatio: ratio, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
    setBusy(false); onChanged()
  }

  async function remove() {
    setBusy(true); await deleteCard(card.id); setBusy(false); onChanged(); onClose()
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded bg-surface-dim border border-surface-bright p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{card.number} {card.name}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-on-variant hover:text-on-surface"><X /></button>
        </div>

        <div className="grid place-items-center rounded bg-surface aspect-[9/16] max-h-[50vh] overflow-hidden">
          {url ? <img src={url} alt={card.name} className="h-full w-full object-contain" />
               : <span className="text-on-variant">Sem imagem</span>}
        </div>

        <label className="flex items-center gap-2 text-sm text-on-variant">
          <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} />
          Otimizar imagem antes de enviar (WebP, máx 1600px)
        </label>

        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => onFile(e.target.files?.[0])} />

        <div className="flex flex-wrap gap-2 items-center">
          <button disabled={busy} onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded bg-on-surface text-surface px-3 py-2 text-sm disabled:opacity-50">
            <Upload size={16} /> {url ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)}
            className="rounded bg-surface border border-surface-bright px-2 py-2 text-sm">
            {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separadas, por vírgula"
            className="flex-1 min-w-[12rem] rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
          <button disabled={busy} onClick={saveMeta}
            className="rounded border border-surface-bright px-3 py-2 text-sm hover:bg-surface-bright/30">Salvar</button>
          <button disabled={busy} onClick={remove} aria-label="Excluir card"
            className="rounded px-3 py-2 text-red-400 hover:bg-red-400/10"><Trash2 size={16} /></button>
        </div>
        {busy && <p className="text-sm text-on-variant">Processando…</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/CardModal.tsx
git commit -m "feat: card modal (upload/edit/delete)"
```

### Task 4.3: AddFlow (manual + CSV, into existing collection)

**Files:** Create `src/components/AddFlow.tsx`.

- [ ] **Step 1: Create `src/components/AddFlow.tsx`**
```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import type { AspectRatio, Collection, NewCard } from '../lib/catalog/types'
import { parseCardsCsv } from '../lib/catalog/csv'
import { createCards } from '../lib/catalog/repository'

const RATIOS: AspectRatio[] = ['1:1', '9:16', '3:4']

export function AddFlow({ collection, onClose, onAdded }: {
  collection: Collection; onClose: () => void; onAdded: () => void
}) {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')
  const [busy, setBusy] = useState(false)
  // manual
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [ratio, setRatio] = useState<AspectRatio>('3:4')
  const [tags, setTags] = useState('')
  // csv
  const [preview, setPreview] = useState<NewCard[]>([])
  const [errors, setErrors] = useState<string[]>([])

  async function onCsv(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    const res = parseCardsCsv(text)
    setPreview(res.rows); setErrors(res.errors)
  }

  async function submit() {
    setBusy(true)
    const rows: NewCard[] = mode === 'manual'
      ? [{ number, name, aspectRatio: ratio, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }]
      : preview
    await createCards(collection.id, rows)
    setBusy(false); onAdded()
  }

  const canSubmit = mode === 'manual' ? number.trim() && name.trim() : preview.length > 0

  return (
    <div className="fixed inset-0 z-30 grid place-items-center p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded bg-surface-dim border border-surface-bright p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Adicionar a {collection.name}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-on-variant hover:text-on-surface"><X /></button>
        </div>

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
              <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número (ex: 152)"
                className="w-32 rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
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
            <p className="text-xs text-on-variant">O card entra vazio; envie a imagem depois pelo próprio card.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="file" accept=".csv,text/csv" onChange={(e) => onCsv(e.target.files?.[0])}
              className="block w-full text-sm text-on-variant" />
            <p className="text-xs text-on-variant">Formato: <code>number,name,tags</code> (tags separadas por <code>;</code>).</p>
            {errors.length > 0 && <p className="text-xs text-red-400">{errors.length} linha(s) com problema, ignoradas.</p>}
            {preview.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border border-surface-bright text-sm">
                {preview.map((r, i) => (
                  <div key={i} className="flex justify-between px-3 py-1 border-b border-surface-bright/40">
                    <span>{r.number} {r.name}</span>
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
git commit -m "feat: add flow (manual + CSV import)"
```

### Task 4.4: Export collection + full build check

**Files:** Modify `src/pages/CollectionPage.tsx` (add export button).

- [ ] **Step 1: Add an export helper to the page** — at top of `CollectionPage.tsx`, below imports add:
```tsx
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
```

- [ ] **Step 2: Add the export button** — inside the density/filter row in `CollectionPage.tsx`, after the density button add:
```tsx
            <button onClick={() => collection && exportCsv(collection.name, cards)}
              className="rounded px-3 py-1 text-on-variant hover:text-on-surface">Exportar</button>
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 4: Manual smoke (owner)**

Run: `npm run dev`. Log in. Confirm: `/pokemon` shows 151 cards (empty placeholders, 9:16); search filters; status filter works; density toggle works; open a card → upload an image → it appears filled and progress updates; `+` → add a manual card and a CSV import; Export downloads a CSV.

- [ ] **Step 5: Commit**
```bash
git add src/pages/CollectionPage.tsx
git commit -m "feat: export collection to CSV"
```

---

## Phase 5 — PWA

### Task 5.1: PWA plugin + manifest + icons

**Files:** Modify `vite.config.ts`; Create icons under `public/`.

- [ ] **Step 1: Add icons** — place `public/pwa-192.png` (192×192) and `public/pwa-512.png` (512×512), dark background with the "Studio" wordmark. (Owner can generate quickly; any placeholder PNGs of those exact sizes work to start.)

- [ ] **Step 2: Update `vite.config.ts`**
```ts
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Studio',
        short_name: 'Studio',
        description: 'Minimalist Collection Studio',
        theme_color: '#131313',
        background_color: '#131313',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 3: Build + verify manifest emitted**

Run: `npm run build`
Expected: build succeeds; `dist/manifest.webmanifest` and `dist/sw.js` exist.

- [ ] **Step 4: Commit**
```bash
git add vite.config.ts public/pwa-192.png public/pwa-512.png
git commit -m "feat: PWA manifest + service worker"
```

### Task 5.2: Vercel environment variables (manual, owner)

- [ ] **Step 1:** In Vercel → Project → Settings → Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Production + Preview). Do **not** add the service-role key to Vercel.
- [ ] **Step 2:** Trigger a deploy (push to `main`). Open the deployed URL on your phone, log in, and confirm the 151 Pokémon load and "Add to Home Screen" installs the PWA.

---

## Self-Review notes

- **Spec coverage:** Stack (Phase 0/5) · Supabase backend + RLS + public bucket (Phase 1) · isolated repository layer (Phase 2) · 151 Pokémon seed at 9:16 (Task 2.6) · auth single-user (Task 3.1) · TopNavBar/Grid/Card/CardModal/AddFlow (Phase 3–4) · AddFlow into existing collections (Task 4.3) · progress bar, filter+search, skeletons, density, export (Phase 3–4) · client-side image optimization with toggle (Tasks 2.4, 4.2) · PWA (Phase 5) · design tokens (Task 0.2). Drag reorder + dedicated tags table correctly deferred to Phase 2 (not in this plan).
- **Type consistency:** `Card`/`Collection`/`NewCard`/`AspectRatio`/`CardStatus` defined once in `types.ts` and reused. Repository function names (`listCards`, `createCards`, `updateCard`, `uploadCardImage`, `deleteCard`, `imageUrl`, `getCollectionBySlug`, `listCollections`) match all call sites in pages/components.
- **No placeholders:** every code step contains full content; the 151 names appear verbatim in both `kanto.ts` and the seed script.
