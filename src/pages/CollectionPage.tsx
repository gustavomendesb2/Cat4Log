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
  listCardsBySubcollection, listCollections, listSubcollections, updateSubcollection,
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
    async function load() {
      setLoading(true)
      const col = await getCollectionBySlug(slug)
      if (!alive || !col) return
      setCollection(col)
      const s = await listSubcollections(col.id)
      if (!alive) return
      setSubs(s)
      const styleSub = style ? s.find((x) => x.slug === style) ?? null : null
      const list = styleSub ? await listCardsBySubcollection(styleSub.id) : await listCardsByCollection(col.id)
      if (alive) { setCards(list); setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [slug, style])

  const visible = useMemo(() => filterCards(cards, { query, status: statusFilter }), [cards, query, statusFilter])
  const progress = useMemo(() => collectionProgress(cards), [cards])

  // Add target: active style, else first style
  const defaultSubId = activeStyle?.id ?? subs[0]?.id ?? ''

  return (
    <div className="min-h-screen overflow-x-hidden">
      <TopNavBar collections={collections} query={query} onQuery={setQuery}
        onAdd={() => setAdding(true)} onNewCollection={() => setNewCollectionOpen(true)} />
      <main className="mx-auto max-w-studio px-4 py-6 sm:px-10 sm:py-8">
        {collection && (
          <StyleTabs collection={collection} subcollections={subs} activeStyleSlug={style ?? null}
            onCreateStyle={() => setNewStyleOpen(true)} onRenameStyle={(s) => setRenaming(s)} />
        )}
        {activeStyle?.description && (
          <p className="-mt-3 mb-6 max-w-prose text-sm text-on-variant">{activeStyle.description}</p>
        )}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <ProgressBar filled={progress.filled} total={progress.total} />
          <div className="flex w-full flex-col gap-2 text-sm sm:w-auto sm:flex-row sm:items-center sm:gap-1.5">
            <div className="flex items-center gap-1.5">
              {(['all', 'empty', 'filled'] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3.5 py-1.5 transition ${statusFilter === s ? 'bg-accent font-medium text-surface-dim' : 'text-on-variant hover:bg-surface-2 hover:text-on-surface'}`}>
                  {s === 'all' ? 'Todos' : s === 'empty' ? 'Vazios' : 'Preenchidos'}
                </button>
              ))}
            </div>
            <span className="mx-1 hidden h-4 w-px bg-surface-bright/60 sm:block" />
            <div className="flex items-center gap-1.5">
              <button onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
                className="rounded-full px-3.5 py-1.5 text-on-variant transition hover:bg-surface-2 hover:text-on-surface">
                {density === 'comfortable' ? 'Compacto' : 'Confortável'}
              </button>
              <button onClick={() => collection && exportCsv(collection.name, cards)}
                className="rounded-full px-3.5 py-1.5 text-on-variant transition hover:bg-surface-2 hover:text-on-surface">Exportar</button>
            </div>
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
          descriptionLabel="Descrição (opcional)"
          onClose={() => setNewStyleOpen(false)}
          onSubmit={async (name, description) => {
            const created = await createSubcollection(collection.id, name, description || null)
            setSubs(await listSubcollections(collection.id))
            setNewStyleOpen(false)
            navigate(`/${collection.slug}/${created.slug}`)
          }} />
      )}
      {renaming && collection && (
        <NameModal title="Editar estilo" label="Nome" initial={renaming.name} submitLabel="Salvar"
          descriptionLabel="Descrição (opcional)" initialDescription={renaming.description ?? ''}
          onClose={() => setRenaming(null)}
          onSubmit={async (name, description) => {
            await updateSubcollection(renaming.id, { name, description: description || null })
            setSubs(await listSubcollections(collection.id))
            setRenaming(null)
          }} />
      )}
    </div>
  )
}
