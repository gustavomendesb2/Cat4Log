import { supabase } from '../supabase'
import { prepareImage } from './image'
import { assignNumbers, slugify } from './numbering'
import type { AspectRatio, Card, Collection, NewCard, Subcollection } from './types'

const BUCKET = 'card-images'

interface CardRow {
  id: string
  collection_id: string
  subcollection_id: string
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
    subcollectionId: r.subcollection_id,
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

export async function listCardsByCollection(collectionId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards').select('*').eq('collection_id', collectionId).order('sort_order')
  if (error) throw error
  return (data as CardRow[]).map(toCard)
}

export async function listCardsBySubcollection(subcollectionId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards').select('*').eq('subcollection_id', subcollectionId).order('sort_order')
  if (error) throw error
  return (data as CardRow[]).map(toCard)
}

export async function listSubcollections(collectionId: string): Promise<Subcollection[]> {
  const { data, error } = await supabase
    .from('subcollections').select('*').eq('collection_id', collectionId).order('sort_order')
  if (error) throw error
  return data.map((s) => ({
    id: s.id, collectionId: s.collection_id, slug: s.slug, name: s.name,
    description: s.description ?? null, sortOrder: s.sort_order,
  }))
}

async function uniqueCollectionSlug(base: string): Promise<string> {
  const { data, error } = await supabase.from('collections').select('slug')
  if (error) throw error
  const taken = new Set((data ?? []).map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

async function uniqueStyleSlug(collectionId: string, base: string): Promise<string> {
  const { data, error } = await supabase
    .from('subcollections').select('slug').eq('collection_id', collectionId)
  if (error) throw error
  const taken = new Set((data ?? []).map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

export async function createCollection(name: string): Promise<Collection> {
  const slug = await uniqueCollectionSlug(slugify(name) || 'colecao')
  const { data: maxRow } = await supabase
    .from('collections').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const sortOrder = (maxRow?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('collections').insert({ slug, name, sort_order: sortOrder }).select('*').single()
  if (error) throw error
  const { error: subErr } = await supabase
    .from('subcollections').insert({ collection_id: data.id, slug: 'padrao', name: 'Padrão', sort_order: 0 })
  if (subErr) throw subErr
  return { id: data.id, slug: data.slug, name: data.name, sortOrder: data.sort_order }
}

export async function createSubcollection(
  collectionId: string, name: string, description: string | null = null,
): Promise<Subcollection> {
  const slug = await uniqueStyleSlug(collectionId, slugify(name) || 'estilo')
  const { data: maxRow } = await supabase
    .from('subcollections').select('sort_order').eq('collection_id', collectionId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const sortOrder = (maxRow?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('subcollections').insert({ collection_id: collectionId, slug, name, description, sort_order: sortOrder })
    .select('*').single()
  if (error) throw error
  return {
    id: data.id, collectionId: data.collection_id, slug: data.slug, name: data.name,
    description: data.description ?? null, sortOrder: data.sort_order,
  }
}

export async function updateSubcollection(
  id: string, patch: { name?: string; description?: string | null },
): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.description !== undefined) dbPatch.description = patch.description
  const { error } = await supabase.from('subcollections').update(dbPatch).eq('id', id)
  if (error) throw error
}

export async function createCards(subcollectionId: string, cards: NewCard[]): Promise<void> {
  if (cards.length === 0) return
  const { data: sub, error: subErr } = await supabase
    .from('subcollections').select('collection_id').eq('id', subcollectionId).single()
  if (subErr) throw subErr
  const existing = await listCardsBySubcollection(subcollectionId)
  const numbered = assignNumbers(cards, existing.map((c) => c.number))
  const rows = numbered.map((c, i) => ({
    collection_id: sub.collection_id,
    subcollection_id: subcollectionId,
    number: c.number,
    name: c.name,
    aspect_ratio: c.aspectRatio,
    tags: c.tags,
    sort_order: existing.length + i,
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
