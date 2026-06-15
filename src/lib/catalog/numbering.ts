import type { NewCard } from './types'

function maxInt(numbers: string[]): number {
  return numbers.reduce((max, n) => {
    const v = parseInt(n, 10)
    return Number.isFinite(v) && v > max ? v : max
  }, 0)
}

export function nextNumber(existing: string[]): string {
  return String(maxInt(existing) + 1).padStart(3, '0')
}

/** Fill rows with an empty `number` using sequential numbers from the current max. */
export function assignNumbers(rows: NewCard[], existing: string[]): NewCard[] {
  const explicit = rows.map((r) => r.number ?? '').filter((n) => n.trim() !== '')
  let n = maxInt([...existing, ...explicit])
  return rows.map((r) => {
    if (r.number && r.number.trim() !== '') return r
    n += 1
    return { ...r, number: String(n).padStart(3, '0') }
  })
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
