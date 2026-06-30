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
