import { describe, expect, it } from 'vitest'
import { assignNumbers, nextNumber, slugify } from './numbering'
import type { NewCard } from './types'

const nc = (over: Partial<NewCard>): NewCard => ({ name: 'X', aspectRatio: '9:16', tags: [], ...over })

describe('nextNumber', () => {
  it('returns 001 for empty input', () => expect(nextNumber([])).toBe('001'))
  it('returns max+1 padded to 3 digits', () => expect(nextNumber(['001', '151'])).toBe('152'))
  it('ignores non-numeric entries', () => expect(nextNumber(['abc', '009', ''])).toBe('010'))
})

describe('assignNumbers', () => {
  it('fills empty numbers sequentially from the max', () => {
    const rows = [nc({ number: '' }), nc({ number: '' })]
    expect(assignNumbers(rows, ['001', '002']).map((r) => r.number)).toEqual(['003', '004'])
  })
  it('keeps explicit numbers and avoids colliding empties with them', () => {
    const rows = [nc({ number: '010' }), nc({ number: '' })]
    expect(assignNumbers(rows, []).map((r) => r.number)).toEqual(['010', '011'])
  })
})

describe('slugify', () => {
  it('lowercases and hyphenates', () => expect(slugify('Estilo A')).toBe('estilo-a'))
  it('strips accents and punctuation', () => expect(slugify('Pókemon Galáxia!')).toBe('pokemon-galaxia'))
})
