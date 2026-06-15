import { describe, expect, it } from 'vitest'
import { collectionProgress, filterCards } from './derive'
import type { Card } from './types'

const card = (over: Partial<Card>): Card => ({
  id: 'x', collectionId: 'c', subcollectionId: 's', number: '001', name: 'Bulbasaur',
  imagePath: null, aspectRatio: '9:16', tags: [], status: 'empty', sortOrder: 0, ...over,
})

describe('collectionProgress', () => {
  it('counts filled vs total', () => {
    const cards = [card({}), card({ status: 'filled' }), card({ status: 'filled' })]
    expect(collectionProgress(cards)).toEqual({ filled: 2, total: 3 })
  })
})

describe('filterCards', () => {
  const cards = [
    card({ number: '006', name: 'Charizard', tags: ['fire'], status: 'filled' }),
    card({ number: '025', name: 'Pikachu', tags: ['electric'], status: 'empty' }),
  ]
  it('filters by status', () => {
    expect(filterCards(cards, { query: '', status: 'empty' })).toHaveLength(1)
    expect(filterCards(cards, { query: '', status: 'filled' })[0].name).toBe('Charizard')
  })
  it('searches name, number and tags case-insensitively', () => {
    expect(filterCards(cards, { query: 'char', status: 'all' })[0].name).toBe('Charizard')
    expect(filterCards(cards, { query: '025', status: 'all' })[0].name).toBe('Pikachu')
    expect(filterCards(cards, { query: 'ELECTRIC', status: 'all' })[0].name).toBe('Pikachu')
  })
})
