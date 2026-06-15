import type { NewCard } from './types'

export interface CsvParseResult {
  rows: NewCard[]
  errors: string[]
}

export function parseCardsCsv(text: string): CsvParseResult {
  const errors: string[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { rows: [], errors: ['CSV is empty'] }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const numIdx = header.indexOf('number')
  const nameIdx = header.indexOf('name')
  const tagsIdx = header.indexOf('tags')
  if (numIdx === -1 || nameIdx === -1) {
    return { rows: [], errors: ['Missing required header: expected "number" and "name"'] }
  }

  const rows: NewCard[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const number = (cols[numIdx] ?? '').trim()
    const name = (cols[nameIdx] ?? '').trim()
    if (!name) {
      errors.push(`Row ${i}: missing name`)
      continue
    }
    const rawTags = tagsIdx === -1 ? '' : (cols[tagsIdx] ?? '').trim()
    const tags = rawTags ? rawTags.split(';').map((t) => t.trim()).filter(Boolean) : []
    rows.push({ number, name, aspectRatio: '3:4', tags })
  }
  return { rows, errors }
}
