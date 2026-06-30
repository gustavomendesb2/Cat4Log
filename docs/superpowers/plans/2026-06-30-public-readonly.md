# Public Read-Only Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o catálogo público (leitura sem login) enquanto controles de edição ficam visíveis apenas para o dono autenticado.

**Architecture:** Remove o gate de autenticação em `Gate.tsx` para que visitantes vejam as rotas normalmente. Cada componente com controles de edição consulta `useAuth().session` diretamente — se `null`, os controles não renderizam. O login passa a ser acessado por um modal acionado na `TopNavBar`.

**Tech Stack:** React 18, TypeScript, React Router v6, Supabase JS v2, Framer Motion, Lucide React, Tailwind CSS

---

## Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Criar | `src/auth/LoginModal.tsx` | Modal de login sobre o catálogo |
| Modificar | `src/Gate.tsx` | Remove gate de auth, gerencia `loginOpen` |
| Modificar | `src/components/TopNavBar.tsx` | Entrar/Sair + esconde botões de edição para visitantes |
| Modificar | `src/components/CardModal.tsx` | Esconde engrenagem, auto-edit, remove otimização |
| Modificar | `src/components/StyleTabs.tsx` | Esconde criar/renomear estilo para visitantes |
| Deletar | `src/auth/LoginScreen.tsx` | Substituído por `LoginModal` |

---

## Task 1: Criar `LoginModal`

**Files:**
- Create: `src/auth/LoginModal.tsx`

O modal reutiliza toda a lógica do `LoginScreen` mas envolve o formulário num backdrop + card modal. Ao autenticar com sucesso, `onAuthStateChange` no `AuthProvider` detecta a sessão automaticamente — o modal só precisa chamar `onClose`.

- [ ] **Step 1: Criar `src/auth/LoginModal.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const REMEMBERED_EMAIL_KEY = 'cat4log_remembered_email'

export function LoginModal({ onClose }: { onClose: () => void }) {
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
    if (error) { setError(error.message); setBusy(false) }
    // sucesso: AuthProvider detecta sessão via onAuthStateChange, fecha o modal
    else onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-6"
      style={{ background: 'var(--backdrop)' }}
      onClick={onClose}
    >
      <motion.form
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm space-y-5 rounded-2xl bg-surface-dim p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-on-variant transition hover:bg-surface-2 hover:text-on-surface"
        >
          <X size={16} />
        </button>
        <div className="space-y-1 text-center">
          <h1 className="font-display text-3xl tracking-tight">cat4log</h1>
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

- [ ] **Step 2: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: sem erros relacionados a `LoginModal`.

- [ ] **Step 3: Commit**

```bash
git add src/auth/LoginModal.tsx
git commit -m "feat(auth): LoginModal como modal sobre o catálogo"
```

---

## Task 2: Atualizar `Gate.tsx`

**Files:**
- Modify: `src/Gate.tsx`
- Delete: `src/auth/LoginScreen.tsx` (não é mais usado)

Remove o early-return que bloqueava visitantes. Gerencia o estado `loginOpen` e renderiza `LoginModal` quando ativo. Passa `onLoginOpen` para `TopNavBar` via props adicionadas nas Tasks seguintes — por ora só a estrutura do Gate muda.

- [ ] **Step 1: Substituir conteúdo de `src/Gate.tsx`**

```tsx
import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/authContext'
import { LoginModal } from './auth/LoginModal'
import { CollectionPage } from './pages/CollectionPage'

export function Gate() {
  const { loading } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)

  if (loading) return <div className="min-h-screen grid place-items-center text-on-variant">Carregando…</div>

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/pokemon" replace />} />
        <Route path="/:slug" element={<CollectionPage onLoginOpen={() => setLoginOpen(true)} />} />
        <Route path="/:slug/:style" element={<CollectionPage onLoginOpen={() => setLoginOpen(true)} />} />
        <Route path="*" element={<Navigate to="/pokemon" replace />} />
      </Routes>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Deletar `src/auth/LoginScreen.tsx`**

```bash
git rm src/auth/LoginScreen.tsx
```

- [ ] **Step 3: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: erros apenas em `CollectionPage` e `TopNavBar` (ainda não têm a prop `onLoginOpen`) — vamos resolver nas próximas tasks.

- [ ] **Step 4: Commit**

```bash
git add src/Gate.tsx
git commit -m "feat(gate): acesso público ao catálogo, LoginModal gerenciado no Gate"
```

---

## Task 3: Atualizar `TopNavBar`

**Files:**
- Modify: `src/components/TopNavBar.tsx`

Adiciona `useAuth()` e `onLoginOpen` prop. Quando sem sessão: esconde `+` (add card) e `+ coleção`, mostra "Entrar". Quando com sessão: mostra botões de edição + "Sair".

- [ ] **Step 1: Substituir conteúdo de `src/components/TopNavBar.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { Plus, Search, LogIn, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/authContext'

interface Props {
  collections: { slug: string; name: string }[]
  query: string
  onQuery: (v: string) => void
  onAdd: () => void
  onNewCollection: () => void
  onLoginOpen: () => void
}

export function TopNavBar({ collections, query, onQuery, onAdd, onNewCollection, onLoginOpen }: Props) {
  const { session } = useAuth()

  const collectionNav = (
    <>
      {collections.map((c) => (
        <NavLink key={c.slug} to={`/${c.slug}`}
          className={({ isActive }) =>
            `relative shrink-0 pb-1 text-sm transition-colors ${isActive ? 'text-on-surface' : 'text-on-variant hover:text-on-surface'}`}>
          {({ isActive }) => (
            <>
              {c.name}
              {isActive && <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-accent" />}
            </>
          )}
        </NavLink>
      ))}
      {session && (
        <button onClick={onNewCollection} aria-label="Nova coleção"
          className="flex shrink-0 items-center gap-1 text-sm text-on-variant transition-colors hover:text-on-surface">
          <Plus size={14} /> coleção
        </button>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-20 border-b border-surface-bright/40 bg-surface-dim/80 backdrop-blur-xl">
      <div className="mx-auto max-w-studio px-4 sm:px-10">
        <div className="flex h-16 items-center gap-3 sm:gap-8">
          <span className="shrink-0 font-display text-xl font-semibold tracking-tight">cat4log</span>
          <nav className="hidden items-center gap-6 md:flex">{collectionNav}</nav>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-surface-bright/70 bg-surface-2 px-3.5 py-1.5
              transition focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 sm:flex-none">
              <Search size={15} className="shrink-0 text-on-variant" />
              <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar…"
                className="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-faint sm:w-40" />
            </div>
            {session ? (
              <>
                <button onClick={onAdd} aria-label="Adicionar card"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-surface-dim transition
                    hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-accent/50">
                  <Plus size={18} />
                </button>
                <button onClick={() => supabase.auth.signOut()} aria-label="Sair"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-variant transition hover:bg-surface-2 hover:text-on-surface">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button onClick={onLoginOpen} aria-label="Entrar"
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-on-variant transition hover:bg-surface-2 hover:text-on-surface">
                <LogIn size={15} /> Entrar
              </button>
            )}
          </div>
        </div>
        <nav className="no-scrollbar -mx-4 flex items-center gap-5 overflow-x-auto px-4 pb-2.5 md:hidden">
          {collectionNav}
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: erro em `CollectionPage` por não passar `onLoginOpen` para `TopNavBar` — corrigido na Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopNavBar.tsx
git commit -m "feat(nav): Entrar/Sair na nav, botões de edição só para autenticados"
```

---

## Task 4: Atualizar `CollectionPage`

**Files:**
- Modify: `src/pages/CollectionPage.tsx`

Adiciona prop `onLoginOpen` recebida do `Gate` e repassa para `TopNavBar`.

- [ ] **Step 1: Adicionar prop `onLoginOpen` em `CollectionPage`**

Localizar a assinatura da função (linha 29) e adicionar a prop:

```tsx
export function CollectionPage({ onLoginOpen }: { onLoginOpen: () => void }) {
```

- [ ] **Step 2: Repassar `onLoginOpen` para `TopNavBar`**

Localizar onde `TopNavBar` é renderizado (linha 82–83) e adicionar a prop:

```tsx
<TopNavBar collections={collections} query={query} onQuery={setQuery}
  onAdd={() => setAdding(true)} onNewCollection={() => setNewCollectionOpen(true)}
  onLoginOpen={onLoginOpen} />
```

- [ ] **Step 3: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CollectionPage.tsx
git commit -m "feat(collection): repassa onLoginOpen do Gate para TopNavBar"
```

---

## Task 5: Atualizar `CardModal`

**Files:**
- Modify: `src/components/CardModal.tsx`

Três mudanças: (1) esconde botão de engrenagem para visitantes, (2) abre direto em modo edição quando o card não tem imagem, (3) remove checkbox de otimização e envia sem otimização.

- [ ] **Step 1: Substituir conteúdo de `src/components/CardModal.tsx`**

```tsx
import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X, Upload, Trash2, Settings2 } from 'lucide-react'
import type { AspectRatio, Card } from '../lib/catalog/types'
import { deleteCard, imageUrl, updateCard, uploadCardImage } from '../lib/catalog/repository'
import { useAuth } from '../auth/authContext'

const RATIOS: AspectRatio[] = ['1:1', '9:16', '3:4']

export function CardModal({ card, onClose, onChanged }: {
  card: Card; onClose: () => void; onChanged: () => void
}) {
  const { session } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [tags, setTags] = useState(card.tags.join(', '))
  const [ratio, setRatio] = useState<AspectRatio>(card.aspectRatio)
  const [editing, setEditing] = useState(!card.imagePath)
  const reduce = useReducedMotion()
  const url = imageUrl(card.imagePath)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    await uploadCardImage(card, file, false)
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
        className="modal-card relative !w-auto max-w-[92vw] overflow-hidden sm:max-w-[96vw]" onClick={(e) => e.stopPropagation()}>

        {url ? (
          <img src={url} alt={card.name} className="block max-h-[88vh] w-auto max-w-[92vw] object-contain sm:h-[92dvh] sm:max-h-[92dvh] sm:max-w-[96vw]" />
        ) : (
          <div className="grid aspect-[9/16] w-[min(80vw,360px)] place-items-center bg-surface-dim text-on-faint">Sem imagem</div>
        )}

        {/* legenda */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-4 pt-12">
          <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{card.number}</span>
          <h2 className="font-display text-2xl leading-tight text-white">{card.name}</h2>
        </div>

        {/* painel de edição — só para autenticados */}
        {session && (
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-10 flex flex-col justify-end gap-4 overflow-y-auto bg-black/60 p-5 backdrop-blur-md">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

                <button disabled={busy} onClick={() => fileRef.current?.click()} className="btn-primary w-full">
                  <Upload size={16} /> {url ? 'Trocar imagem' : 'Enviar imagem'}
                </button>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Proporção</label>
                    <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="field">
                      {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Tags</label>
                    <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separadas, por vírgula" className="field" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button disabled={busy} onClick={saveMeta} className="btn-primary flex-1">Salvar</button>
                  <button disabled={busy} onClick={remove} aria-label="Excluir card"
                    className="rounded border border-white/20 px-3 py-2 text-red-400 transition hover:bg-red-500/10"><Trash2 size={16} /></button>
                </div>
                {busy && <p className="text-sm text-white/70">Processando…</p>}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* controles superiores */}
        <div className="absolute right-3 top-3 z-20 flex gap-2">
          {session && (
            <button onClick={() => setEditing((v) => !v)} aria-label={editing ? 'Fechar edição' : 'Editar'}
              className={`grid h-8 w-8 place-items-center rounded-full backdrop-blur-sm transition
                ${editing ? 'bg-accent text-surface-dim' : 'bg-black/30 text-white/75 hover:bg-black/55 hover:text-white'}`}>
              <Settings2 size={16} />
            </button>
          )}
          <button onClick={onClose} aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white/75 backdrop-blur-sm transition hover:bg-black/55 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/CardModal.tsx
git commit -m "feat(modal): engrenagem só p/ autenticados, auto-edit s/ imagem, remove otimização"
```

---

## Task 6: Atualizar `StyleTabs`

**Files:**
- Modify: `src/components/StyleTabs.tsx`

Esconde botões de criar estilo e renomear estilo para visitantes.

- [ ] **Step 1: Substituir conteúdo de `src/components/StyleTabs.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import type { Collection, Subcollection } from '../lib/catalog/types'
import { useAuth } from '../auth/authContext'

interface Props {
  collection: Collection
  subcollections: Subcollection[]
  activeStyleSlug: string | null
  onCreateStyle: () => void
  onRenameStyle: (s: Subcollection) => void
}

export function StyleTabs({ collection, subcollections, activeStyleSlug, onCreateStyle, onRenameStyle }: Props) {
  const { session } = useAuth()
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
          {session && active && (
            <button onClick={() => onRenameStyle(active)} aria-label="Renomear estilo"
              className="grid h-8 w-8 place-items-center rounded-full text-on-variant transition hover:bg-surface-2 hover:text-on-surface"><Pencil size={14} /></button>
          )}
        </>
      )}
      {session && (
        <button onClick={onCreateStyle} aria-label="Novo estilo"
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-on-variant transition hover:bg-surface-2 hover:text-on-surface">
          <Plus size={14} /> estilo
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/StyleTabs.tsx
git commit -m "feat(tabs): criar/renomear estilo só para autenticados"
```

---

## Task 7: Supabase RLS — leitura pública

**Files:** nenhum arquivo de código — configuração no painel do Supabase.

Esta task é manual. Execute os SQLs no **SQL Editor** do projeto Supabase.

- [ ] **Step 1: Abrir SQL Editor no painel do Supabase**

Acesse: painel do projeto → SQL Editor → New Query

- [ ] **Step 2: Criar política de leitura pública para `collections`**

```sql
create policy "public read collections"
  on collections
  for select
  using (true);
```

- [ ] **Step 3: Criar política de leitura pública para `subcollections`**

```sql
create policy "public read subcollections"
  on subcollections
  for select
  using (true);
```

- [ ] **Step 4: Criar política de leitura pública para `cards`**

```sql
create policy "public read cards"
  on cards
  for select
  using (true);
```

- [ ] **Step 5: Habilitar acesso público ao storage bucket `card-images`**

No painel do Supabase: Storage → card-images → (⋯ ou ícone de configurações) → Make public.

Ou via SQL:

```sql
update storage.buckets
  set public = true
  where name = 'card-images';
```

- [ ] **Step 6: Verificar no browser sem login**

Abrir o catálogo em aba anônima. As coleções, cards e imagens devem carregar sem autenticação.

---

## Task 8: Teste manual completo

- [ ] **Abrir em aba anônima (sem login)**
  - Catálogo carrega, cards visíveis
  - Botões `+` e `+ coleção` não aparecem
  - Botão "Entrar" visível na nav
  - Clicar num card COM imagem → modal abre em modo visualização (sem engrenagem)
  - Clicar num card SEM imagem → modal abre em modo visualização (sem engrenagem, sem painel)
  - Tabs de estilo visíveis (se houver múltiplos), sem lápis nem `+ estilo`

- [ ] **Fazer login pelo botão "Entrar" na nav**
  - Modal de login abre sobre o catálogo
  - Credenciais corretas → modal fecha, botões de edição aparecem
  - Clicar num card SEM imagem → abre direto no painel de upload
  - Upload de imagem funciona sem otimização

- [ ] **Fazer logout**
  - Clicar ícone de logout na nav
  - Botões de edição desaparecem, "Entrar" volta
