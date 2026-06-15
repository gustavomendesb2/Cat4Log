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
        {collection && (
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
