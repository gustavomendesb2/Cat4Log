export type AspectRatio = '1:1' | '9:16' | '3:4'
export type CardStatus = 'empty' | 'filled'

export interface Collection {
  id: string
  slug: string
  name: string
  sortOrder: number
}

export interface Subcollection {
  id: string
  collectionId: string
  slug: string
  name: string
  sortOrder: number
}

export interface Card {
  id: string
  collectionId: string
  subcollectionId: string
  number: string
  name: string
  imagePath: string | null
  aspectRatio: AspectRatio
  tags: string[]
  status: CardStatus
  sortOrder: number
}

/** A new card before it exists in the DB. `number` empty/undefined triggers auto-numbering. */
export interface NewCard {
  number?: string
  name: string
  aspectRatio: AspectRatio
  tags: string[]
}
