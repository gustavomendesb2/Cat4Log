import type { Card, CardStatus } from './types'

export interface CardFilter {
  query: string
  status: CardStatus | 'all'
}

export function collectionProgress(cards: Card[]): { filled: number; total: number } {
  return { filled: cards.filter((c) => c.status === 'filled').length, total: cards.length }
}

export function filterCards(cards: Card[], filter: CardFilter): Card[] {
  const q = filter.query.trim().toLowerCase()
  return cards.filter((c) => {
    if (filter.status !== 'all' && c.status !== filter.status) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.number.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    )
  })
}
