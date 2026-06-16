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
