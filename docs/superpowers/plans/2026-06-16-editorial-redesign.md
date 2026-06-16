# Redesign Visual (Galeria Editorial Premium) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repaginar o visual do cat4log para uma galeria editorial premium (dark monocromático + acento esmeralda) sem alterar estrutura, rotas, estado ou lógica.

**Architecture:** Abordagem token-first — reescrever a camada de design tokens (`tokens.css` + tema do Tailwind via canais RGB com `<alpha-value>`) para que ~70% do impacto se propague pelas classes Tailwind já existentes. Depois, passadas pontuais por componente trocando apenas classes e adicionando microinterações com framer-motion (já instalado). Três classes utilitárias em `@layer components` (`.field`, `.btn-primary`/`.btn-ghost`, `.modal-card`) cortam a duplicação que hoje se repete em modais/login.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 3.4, framer-motion 12, lucide-react.

**Verificação (vale para todas as tasks):** mudanças visuais não têm teste unitário; cada task termina com `npm run build` e `npm run lint` passando. A suíte de lógica (`npm test`) não é tocada e é validada na Task 8.

---

## Mapa de arquivos

- `src/styles/tokens.css` — fonte única das cores (canais RGB) + radius/sombra. **Reescrito** (Task 1).
- `tailwind.config.js` — tema aponta para os tokens via `rgb(var(--x) / <alpha-value>)`; novas chaves `accent`, `surface-2/3`, `on-faint`, keyframes shimmer. **Reescrito** (Task 1).
- `src/index.css` — base, overlay de grão, `prefers-reduced-motion`, `@layer components`. **Reescrito** (Task 1).
- `src/components/Card.tsx`, `CollectionGrid.tsx`, `Skeleton.tsx` — cards/grid/loading (Task 2).
- `src/components/TopNavBar.tsx`, `ProgressBar.tsx` — cromo do topo (Task 3).
- `src/components/StyleTabs.tsx` + filtros em `src/pages/CollectionPage.tsx` (Task 4).
- `src/components/CardModal.tsx` (Task 5).
- `src/components/AddFlow.tsx`, `NameModal.tsx` (Task 6).
- `src/auth/LoginScreen.tsx`, `index.html` (Task 7).

---

## Task 1: Fundação — tokens, tema Tailwind e base CSS

**Files:**
- Modify (rewrite): `src/styles/tokens.css`
- Modify (rewrite): `tailwind.config.js`
- Modify (rewrite): `src/index.css`

- [ ] **Step 1: Reescrever `src/styles/tokens.css`**

```css
:root {
  /* rampa de neutros — canais RGB para o <alpha-value> do Tailwind */
  --surface-dim-rgb: 10 10 11;
  --surface-rgb: 18 18 20;
  --surface-2-rgb: 26 26 29;
  --surface-3-rgb: 36 36 41;
  --surface-bright-rgb: 56 56 63;

  --on-surface-rgb: 245 245 244;
  --on-surface-variant-rgb: 150 150 156;
  --on-surface-faint-rgb: 92 92 99;

  /* acento — esmeralda */
  --accent-rgb: 52 211 153;
  --accent-strong-rgb: 16 185 129;

  --radius: 6px;
  --radius-lg: 14px;
  --margin-x: 40px;
  --backdrop: rgba(0, 0, 0, 0.78);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 10px 34px rgba(0, 0, 0, 0.5);
}
```

- [ ] **Step 2: Reescrever `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
const ch = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: ch('--surface-rgb'),
          dim: ch('--surface-dim-rgb'),
          2: ch('--surface-2-rgb'),
          3: ch('--surface-3-rgb'),
          bright: ch('--surface-bright-rgb'),
        },
        on: {
          surface: ch('--on-surface-rgb'),
          variant: ch('--on-surface-variant-rgb'),
          faint: ch('--on-surface-faint-rgb'),
        },
        accent: {
          DEFAULT: ch('--accent-rgb'),
          strong: ch('--accent-strong-rgb'),
        },
      },
      borderRadius: { DEFAULT: '6px', lg: '14px' },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { studio: '1600px' },
      boxShadow: { card: 'var(--shadow-md)' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { shimmer: 'shimmer 1.6s infinite' },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Reescrever `src/index.css`**

```css
@import './styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }

body {
  margin: 0;
  background: rgb(var(--surface-dim-rgb));
  color: rgb(var(--on-surface-rgb));
  font-family: Inter, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* grão sutil para a sensação de galeria */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");
}

#root { position: relative; z-index: 1; }

@layer components {
  .field {
    @apply w-full rounded bg-surface border border-surface-bright/70 px-3 py-2 text-sm text-on-surface
           outline-none transition placeholder:text-on-faint
           focus:border-accent/60 focus:ring-2 focus:ring-accent/25;
  }
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium
           text-surface-dim transition hover:bg-accent-strong
           focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40;
  }
  .btn-ghost {
    @apply inline-flex items-center justify-center gap-2 rounded border border-surface-bright/70 px-3 py-2 text-sm
           text-on-surface transition hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent/40
           disabled:pointer-events-none disabled:opacity-40;
  }
  .modal-card {
    @apply w-full rounded-lg border border-surface-bright/60 bg-surface-2/95 shadow-card backdrop-blur-xl;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: ambos PASS (sem erros TS, sem erros de lint). O app já fica visivelmente mais escuro/encorpado mesmo antes das próximas tasks, pois as classes existentes (`bg-surface`, `text-on-variant` etc.) passam a ler os novos tokens.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css tailwind.config.js src/index.css
git commit -m "feat(ui): fundação de tokens editorial + acento esmeralda"
```

---

## Task 2: Cards, grid e skeleton

**Files:**
- Modify (rewrite): `src/components/Card.tsx`
- Modify (rewrite): `src/components/CollectionGrid.tsx`
- Modify (rewrite): `src/components/Skeleton.tsx`

- [ ] **Step 1: Reescrever `src/components/Card.tsx`**

```tsx
import { motion, useReducedMotion } from 'framer-motion'
import type { Card as CardType } from '../lib/catalog/types'
import { imageUrl } from '../lib/catalog/repository'

const ASPECT: Record<CardType['aspectRatio'], string> = {
  '1:1': 'aspect-square', '9:16': 'aspect-[9/16]', '3:4': 'aspect-[3/4]',
}

export function Card({ card, onOpen }: { card: CardType; onOpen: (c: CardType) => void }) {
  const url = imageUrl(card.imagePath)
  const reduce = useReducedMotion()
  return (
    <motion.button
      layout
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpen(card)}
      className={`group relative w-full overflow-hidden rounded-lg bg-surface-2 outline-none
        ring-1 ring-inset ring-white/5 transition-shadow duration-300
        hover:shadow-card focus-visible:ring-2 focus-visible:ring-accent ${ASPECT[card.aspectRatio]}`}
    >
      {url ? (
        <>
          <img src={url} alt={card.name} loading="lazy"
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]" />
          <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px] shadow-accent/70" />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-surface-bright/50">
          <span className="font-display text-4xl tracking-tight text-on-faint/60">{card.number}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t
        from-black/80 via-black/20 to-transparent px-3 pb-2.5 pt-10">
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-accent/90">{card.number}</span>
          <span className="block truncate text-sm text-white/95">{card.name}</span>
        </div>
      </div>
    </motion.button>
  )
}
```

- [ ] **Step 2: Reescrever `src/components/CollectionGrid.tsx`**

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
      <div className={`grid gap-5 ${GRID[density]}`}>
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[9/16] rounded-lg" />)}
      </div>
    )
  }
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="font-display text-2xl text-on-variant">Nenhum card ainda</p>
        <p className="text-sm text-on-faint">Use o botão + para adicionar à coleção.</p>
      </div>
    )
  }
  return (
    <div className={`grid gap-5 ${GRID[density]}`}>
      {cards.map((c) => <Card key={c.id} card={c} onOpen={onOpen} />)}
    </div>
  )
}
```

- [ ] **Step 3: Reescrever `src/components/Skeleton.tsx`**

```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer
        bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  )
}
```

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. Visual: cards com cantos arredondados, ring sutil, hover com zoom + sombra; ponto esmeralda no canto dos preenchidos; legenda com scrim; skeleton com shimmer.

- [ ] **Step 5: Commit**

```bash
git add src/components/Card.tsx src/components/CollectionGrid.tsx src/components/Skeleton.tsx
git commit -m "feat(ui): cards de galeria, grid e skeleton com shimmer"
```

---

## Task 3: TopNavBar e ProgressBar

**Files:**
- Modify (rewrite): `src/components/TopNavBar.tsx`
- Modify (rewrite): `src/components/ProgressBar.tsx`

- [ ] **Step 1: Reescrever `src/components/TopNavBar.tsx`** (wordmark "cat4log", tab ativa com sublinhado esmeralda, busca e botão + refinados)

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
    <header className="sticky top-0 z-20 border-b border-surface-bright/40 bg-surface-dim/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-studio items-center gap-8 px-10">
        <span className="font-display text-xl font-semibold tracking-tight">cat4log</span>
        <nav className="flex items-center gap-6">
          {collections.map((c) => (
            <NavLink key={c.slug} to={`/${c.slug}`}
              className={({ isActive }) =>
                `relative pb-1 text-sm transition-colors ${isActive ? 'text-on-surface' : 'text-on-variant hover:text-on-surface'}`}>
              {({ isActive }) => (
                <>
                  {c.name}
                  {isActive && <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-accent" />}
                </>
              )}
            </NavLink>
          ))}
          <button onClick={onNewCollection} aria-label="Nova coleção"
            className="flex items-center gap-1 text-sm text-on-variant transition-colors hover:text-on-surface">
            <Plus size={14} /> coleção
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-surface-bright/70 bg-surface-2 px-3.5 py-1.5
            transition focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20">
            <Search size={15} className="text-on-variant" />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar…"
              className="w-40 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-faint" />
          </div>
          <button onClick={onAdd} aria-label="Adicionar card"
            className="grid h-9 w-9 place-items-center rounded-full bg-accent text-surface-dim transition
              hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-accent/50">
            <Plus size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Reescrever `src/components/ProgressBar.tsx`** (fill esmeralda em gradiente, com %)

```tsx
export function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
  return (
    <div className="flex items-center gap-3 text-sm text-on-variant">
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums">
        <span className="font-medium text-on-surface">{filled}</span>/{total}
        <span className="ml-1 text-on-faint">· {pct}%</span>
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. Visual: topo com "cat4log", tab ativa sublinhada em esmeralda, busca em pill, botão + esmeralda; barra de progresso esmeralda com porcentagem.

- [ ] **Step 4: Commit**

```bash
git add src/components/TopNavBar.tsx src/components/ProgressBar.tsx
git commit -m "feat(ui): topbar com wordmark cat4log + progress esmeralda"
```

---

## Task 4: StyleTabs e filtros da página

**Files:**
- Modify (rewrite): `src/components/StyleTabs.tsx`
- Modify (edit): `src/pages/CollectionPage.tsx` (bloco de filtros)

- [ ] **Step 1: Reescrever `src/components/StyleTabs.tsx`** (pills, ativo em esmeralda)

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
    `rounded-full px-3.5 py-1.5 text-sm transition ${active ? 'bg-accent font-medium text-surface-dim' : 'text-on-variant hover:bg-surface-2 hover:text-on-surface'}`
  const active = subcollections.find((s) => s.slug === activeStyleSlug) ?? null
  const multi = subcollections.length > 1

  return (
    <div className="mb-6 flex flex-wrap items-center gap-1.5">
      {multi && (
        <>
          <NavLink to={`/${collection.slug}`} end className={() => tabClass(activeStyleSlug === null)}>Geral</NavLink>
          {subcollections.map((s) => (
            <NavLink key={s.id} to={`/${collection.slug}/${s.slug}`} className={() => tabClass(activeStyleSlug === s.slug)}>
              {s.name}
            </NavLink>
          ))}
          {active && (
            <button onClick={() => onRenameStyle(active)} aria-label="Renomear estilo"
              className="grid h-8 w-8 place-items-center rounded-full text-on-variant transition hover:bg-surface-2 hover:text-on-surface"><Pencil size={14} /></button>
          )}
        </>
      )}
      <button onClick={onCreateStyle} aria-label="Novo estilo"
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-on-variant transition hover:bg-surface-2 hover:text-on-surface">
        <Plus size={14} /> estilo
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Editar o bloco de filtros em `src/pages/CollectionPage.tsx`**

Substituir exatamente este trecho:

```tsx
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
```

Por:

```tsx
          <div className="flex items-center gap-1.5 text-sm">
            {(['all', 'empty', 'filled'] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3.5 py-1.5 transition ${statusFilter === s ? 'bg-accent font-medium text-surface-dim' : 'text-on-variant hover:bg-surface-2 hover:text-on-surface'}`}>
                {s === 'all' ? 'Todos' : s === 'empty' ? 'Vazios' : 'Preenchidos'}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-surface-bright/60" />
            <button onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              className="rounded-full px-3.5 py-1.5 text-on-variant transition hover:bg-surface-2 hover:text-on-surface">
              {density === 'comfortable' ? 'Compacto' : 'Confortável'}
            </button>
            <button onClick={() => collection && exportCsv(collection.name, cards)}
              className="rounded-full px-3.5 py-1.5 text-on-variant transition hover:bg-surface-2 hover:text-on-surface">Exportar</button>
          </div>
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. Visual: tabs de estilo e filtros como pills; estado ativo em esmeralda; separador sutil antes de Compacto/Exportar.

- [ ] **Step 4: Commit**

```bash
git add src/components/StyleTabs.tsx src/pages/CollectionPage.tsx
git commit -m "feat(ui): tabs de estilo e filtros em pills com acento"
```

---

## Task 5: CardModal

**Files:**
- Modify (rewrite): `src/components/CardModal.tsx`

- [ ] **Step 1: Reescrever `src/components/CardModal.tsx`** (layout 2 colunas em telas largas, entrada com motion, classes utilitárias)

```tsx
import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
  const reduce = useReducedMotion()
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
    <div className="fixed inset-0 z-30 grid place-items-center p-4 sm:p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="modal-card max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="grid max-h-[55vh] place-items-center bg-surface-dim md:max-h-[80vh]">
            {url ? <img src={url} alt={card.name} className="h-full w-full object-contain" />
                 : <span className="py-24 text-on-faint">Sem imagem</span>}
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{card.number}</span>
                <h2 className="font-display text-2xl leading-tight">{card.name}</h2>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="text-on-variant transition hover:text-on-surface"><X /></button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

            <button disabled={busy} onClick={() => fileRef.current?.click()} className="btn-primary w-full">
              <Upload size={16} /> {url ? 'Trocar imagem' : 'Enviar imagem'}
            </button>

            <label className="flex items-center gap-2 text-sm text-on-variant">
              <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} className="accent-accent" />
              Otimizar imagem antes de enviar (WebP, máx 1600px)
            </label>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-on-faint">Proporção</label>
                <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="field">
                  {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-on-faint">Tags</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separadas, por vírgula" className="field" />
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2 pt-2">
              <button disabled={busy} onClick={saveMeta} className="btn-ghost flex-1">Salvar</button>
              <button disabled={busy} onClick={remove} aria-label="Excluir card"
                className="rounded border border-surface-bright/60 px-3 py-2 text-red-400 transition hover:bg-red-500/10"><Trash2 size={16} /></button>
            </div>
            {busy && <p className="text-sm text-on-variant">Processando…</p>}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. Visual: modal maior, imagem à esquerda e metadados à direita em telas largas; entrada com leve scale/fade; botão de upload esmeralda; inputs com foco esmeralda.

- [ ] **Step 3: Commit**

```bash
git add src/components/CardModal.tsx
git commit -m "feat(ui): CardModal premium em duas colunas com motion"
```

---

## Task 6: AddFlow e NameModal

**Files:**
- Modify (rewrite): `src/components/AddFlow.tsx`
- Modify (rewrite): `src/components/NameModal.tsx`

- [ ] **Step 1: Reescrever `src/components/AddFlow.tsx`** (classes utilitárias, tabs/primário esmeralda, motion)

```tsx
import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [ratio, setRatio] = useState<AspectRatio>('9:16')
  const [tags, setTags] = useState('')
  const [csvRatio, setCsvRatio] = useState<AspectRatio>('9:16')
  const [preview, setPreview] = useState<NewCard[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const reduce = useReducedMotion()

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
  const tab = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 transition ${active ? 'bg-accent font-medium text-surface-dim' : 'text-on-variant hover:bg-surface-2 hover:text-on-surface'}`

  return (
    <div className="fixed inset-0 z-30 grid place-items-center p-4 sm:p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="modal-card max-w-lg space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Adicionar a {collectionName}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-on-variant transition hover:text-on-surface"><X /></button>
        </div>

        {subcollections.length > 1 && (
          <label className="block text-sm text-on-variant">
            Estilo de destino
            <select value={targetSub} onChange={(e) => setTargetSub(e.target.value)} className="field mt-1">
              {subcollections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}

        <div className="flex gap-1.5 text-sm">
          {(['manual', 'csv'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={tab(mode === m)}>
              {m === 'manual' ? 'Manual' : 'Importar CSV'}
            </button>
          ))}
        </div>

        {mode === 'manual' ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número (vazio = próximo)"
                className="field !w-44" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="field flex-1" />
            </div>
            <div className="flex gap-3">
              <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="field !w-auto">
                {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, por vírgula" className="field flex-1" />
            </div>
            <p className="text-xs text-on-faint">Número vazio recebe o próximo disponível no estilo. Imagem você envia depois pelo card.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="file" accept=".csv,text/csv" onChange={(e) => onCsv(e.target.files?.[0])}
              className="block w-full text-sm text-on-variant file:mr-3 file:rounded file:border-0 file:bg-surface-3 file:px-3 file:py-1.5 file:text-on-surface" />
            <label className="flex items-center gap-2 text-sm text-on-variant">
              Proporção dos cards
              <select value={csvRatio} onChange={(e) => setCsvRatio(e.target.value as AspectRatio)} className="field !w-auto">
                {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <p className="text-xs text-on-faint">Formato: <code>number,name,tags</code> (tags por <code>;</code>). Número pode ficar vazio.</p>
            {errors.length > 0 && <p className="text-xs text-red-400">{errors.length} linha(s) ignorada(s) (sem nome).</p>}
            {preview.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border border-surface-bright/60 text-sm">
                {preview.map((r, i) => (
                  <div key={i} className="flex justify-between border-b border-surface-bright/30 px-3 py-1">
                    <span>{r.number || '—'} {r.name}</span>
                    <span className="text-on-variant">{r.tags.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button disabled={busy || !canSubmit} onClick={submit} className="btn-primary w-full">
          {busy ? 'Adicionando…' : mode === 'csv' ? `Adicionar ${preview.length} card(s)` : 'Adicionar card'}
        </button>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Reescrever `src/components/NameModal.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

export function NameModal({ title, label, initial = '', submitLabel = 'Salvar', onSubmit, onClose }: {
  title: string; label: string; initial?: string; submitLabel?: string
  onSubmit: (name: string) => Promise<void> | void; onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  const reduce = useReducedMotion()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await onSubmit(name.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4 sm:p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <motion.form
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onSubmit={submit} className="modal-card max-w-sm space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-on-variant transition hover:text-on-surface"><X /></button>
        </div>
        <label className="block text-sm text-on-variant">{label}</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="field" />
        <button disabled={busy || !name.trim()} className="btn-primary w-full">
          {busy ? 'Salvando…' : submitLabel}
        </button>
      </motion.form>
    </div>
  )
}
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. Visual: AddFlow e NameModal com mesmo painel premium, inputs com foco esmeralda, primário esmeralda, entrada com motion.

- [ ] **Step 4: Commit**

```bash
git add src/components/AddFlow.tsx src/components/NameModal.tsx
git commit -m "feat(ui): AddFlow e NameModal com painel e primitivos consistentes"
```

---

## Task 7: LoginScreen e título do documento

**Files:**
- Modify (rewrite): `src/auth/LoginScreen.tsx`
- Modify (edit): `index.html`

- [ ] **Step 1: Reescrever `src/auth/LoginScreen.tsx`** (título "cat4log", classes utilitárias, motion sutil)

```tsx
import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const REMEMBERED_EMAIL_KEY = 'cat4log_remembered_email'

export function LoginScreen() {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const reduce = useReducedMotion()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <motion.form
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="font-display text-4xl tracking-tight">cat4log</h1>
          <p className="text-sm text-on-faint">Entre para gerenciar suas coleções</p>
        </div>
        <input className="field" type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="field" type="password" placeholder="Senha" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-on-variant">
          <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)}
            className="accent-accent" />
          Lembrar email
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </motion.form>
    </div>
  )
}
```

- [ ] **Step 2: Editar `index.html`** — trocar o título

Substituir exatamente:

```html
    <title>Studio</title>
```

Por:

```html
    <title>cat4log</title>
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. Visual: login centrado editorial com "cat4log", inputs e botão consistentes; aba do navegador mostra "cat4log".

- [ ] **Step 4: Commit**

```bash
git add src/auth/LoginScreen.tsx index.html
git commit -m "feat(ui): login editorial cat4log + titulo do documento"
```

---

## Task 8: QA final (consistência, regressão e build de produção)

**Files:** nenhum novo; verificação e ajustes pontuais se necessário.

- [ ] **Step 1: Rodar a suíte de testes de lógica (deve permanecer verde)**

Run: `npm test`
Expected: PASS (testes em `src/lib/catalog/*` não foram tocados).

- [ ] **Step 2: Build de produção + lint**

Run: `npm run build && npm run lint`
Expected: ambos PASS.

- [ ] **Step 3: Checklist visual manual (`npm run dev`)**

Verificar em `npm run dev`:
- Wordmark "cat4log" no topo e no login; aba do navegador "cat4log".
- Acento esmeralda coeso: progresso, botão +, tab/filtro ativo, foco de inputs, ponto de "preenchido" no card.
- Grid de cards: hover com zoom + sombra + ring; legenda legível; skeleton com shimmer ao carregar.
- Modais (card/adicionar/nome): painel premium com blur, entrada animada, primário esmeralda.
- Filtros Todos/Vazios/Preenchidos, Compacto/Confortável e Exportar funcionam (sem regressão).
- Upload de imagem, criação de coleção/estilo e renomear funcionam.
- Com SO em "reduzir movimento", animações ficam praticamente estáticas.

- [ ] **Step 4: Commit de qualquer ajuste de consistência (se houve)**

```bash
git add -A
git commit -m "chore(ui): ajustes finais de consistência do redesign"
```

(Se não houve ajuste, pular este commit.)

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** Fundação/tokens → Task 1. Cards/grid/skeleton → Task 2. TopNav/wordmark/progress → Task 3. Tabs/filtros → Task 4. CardModal → Task 5. AddFlow/NameModal (consistência do primário esmeralda) → Task 6. Login/wordmark + título → Task 7. Motion (`useReducedMotion`) → Tasks 2/5/6/7 + media query em Task 1. QA/regressão → Task 8. ✔
- **Sem placeholders:** todos os steps com mudança de código mostram o arquivo/edição completos. ✔
- **Consistência de tipos/nomes:** classes utilitárias `.field`, `.btn-primary`, `.btn-ghost`, `.modal-card` definidas na Task 1 e usadas exatamente com esses nomes nas Tasks 5–7. Chaves de cor (`surface-2`, `surface-3`, `on-faint`, `accent`, `accent-strong`) definidas na Task 1 e usadas de forma idêntica depois. ✔
- **Escopo:** apenas visual; nenhuma rota/estado/contrato de dados alterado. ✔
