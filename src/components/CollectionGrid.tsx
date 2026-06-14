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
      <div className={`grid gap-4 ${GRID[density]}`}>
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[9/16]" />)}
      </div>
    )
  }
  if (cards.length === 0) {
    return <p className="py-20 text-center text-on-variant">Nenhum card. Use o botão + para adicionar.</p>
  }
  return (
    <div className={`grid gap-4 ${GRID[density]}`}>
      {cards.map((c) => <Card key={c.id} card={c} onOpen={onOpen} />)}
    </div>
  )
}
