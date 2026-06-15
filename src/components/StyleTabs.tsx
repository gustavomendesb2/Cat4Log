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
  const multi = subcollections.length > 1

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
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
              className="grid place-items-center rounded w-7 h-7 text-on-variant hover:text-on-surface"><Pencil size={14} /></button>
          )}
        </>
      )}
      <button onClick={onCreateStyle} aria-label="Novo estilo"
        className="flex items-center gap-1 rounded px-2 py-1 text-sm text-on-variant hover:text-on-surface">
        <Plus size={14} /> estilo
      </button>
    </div>
  )
}
