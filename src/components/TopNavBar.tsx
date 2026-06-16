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
