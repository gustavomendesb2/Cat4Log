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
