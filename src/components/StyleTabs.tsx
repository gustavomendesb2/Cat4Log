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
