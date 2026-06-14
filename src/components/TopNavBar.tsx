import { NavLink } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'

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
