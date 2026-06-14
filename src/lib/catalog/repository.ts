import { supabase } from '../supabase'
import { prepareImage } from './image'
import type { AspectRatio, Card, Collection, NewCard } from './types'

const BUCKET = 'card-images'

interface CardRow {
  id: string
  collection_id: string
  number: string
  name: string
  image_path: string | null
  aspect_ratio: AspectRatio
  tags: string[]
  status: 'empty' | 'filled'
  sort_order: number
}

function toCard(r: CardRow): Card {
  return {
    id: r.id,
    collectionId: r.collection_id,
    number: r.number,
    name: r.name,
    imagePath: r.image_path,
    aspectRatio: r.aspect_ratio,
    tags: r.tags ?? [],
    status: r.status,
    sortOrder: r.sort_order,
  }
}

export function imageUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function listCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections').select('*').order('sort_order')
  if (error) throw error
  return data.map((c) => ({ id: c.id, slug: c.slug, name: c.name, sortOrder: c.sort_order }))
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const { data, error } = await supabase
    .from('collections').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? { id: data.id, slug: data.slug, name: data.name, sortOrder: data.sort_order } : null
}

export async function listCards(collectionId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards').select('*').eq('collection_id', collectionId).order('sort_order')
  if (error) throw error
  return (data as CardRow[]).map(toCard)
}

export async function createCards(collectionId: string, cards: NewCard[]): Promise<void> {
  if (cards.length === 0) return
  const rows = cards.map((c, i) => ({
    collection_id: collectionId,
    number: c.number,
    name: c.name,
    aspect_ratio: c.aspectRatio,
    tags: c.tags,
    sort_order: i,
  }))
  const { error } = await supabase.from('cards').insert(rows)
  if (error) throw error
}

export async function updateCard(
  id: string,
  patch: Partial<Pick<Card, 'name' | 'number' | 'aspectRatio' | 'tags'>>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.number !== undefined) dbPatch.number = patch.number
  if (patch.aspectRatio !== undefined) dbPatch.aspect_ratio = patch.aspectRatio
  if (patch.tags !== undefined) dbPatch.tags = patch.tags
  const { error } = await supabase.from('cards').update(dbPatch).eq('id', id)
  if (error) throw error
}

export async function uploadCardImage(card: Card, file: File, optimize = true): Promise<void> {
  const prepared = await prepareImage(file, optimize)
  const ext = optimize ? 'webp' : (file.name.split('.').pop() || 'png')
  const path = `${card.collectionId}/${card.id}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET).upload(path, prepared, { upsert: true, contentType: prepared.type })
  if (upErr) throw upErr
  const { error } = await supabase.from('cards').update({ image_path: path }).eq('id', card.id)
  if (error) throw error
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw error
}
