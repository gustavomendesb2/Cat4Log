import { describe, expect, it } from 'vitest'
import { parseCardsCsv } from './csv'

describe('parseCardsCsv', () => {
  it('parses number, name and semicolon tags', () => {
    const csv = 'number,name,tags\n006,Charizard,fire;flying\n025,Pikachu,electric'
    expect(parseCardsCsv(csv)).toEqual({
      rows: [
        { number: '006', name: 'Charizard', aspectRatio: '3:4', tags: ['fire', 'flying'] },
        { number: '025', name: 'Pikachu', aspectRatio: '3:4', tags: ['electric'] },
      ],
      errors: [],
    })
  })

  it('tolerates a missing tags column', () => {
    const csv = 'number,name\n001,Bulbasaur'
    expect(parseCardsCsv(csv).rows[0]).toEqual({
      number: '001', name: 'Bulbasaur', aspectRatio: '3:4', tags: [],
    })
  })

  it('allows empty number (auto-numbered later) but requires name', () => {
    const csv = 'number,name\n,Bulbasaur\n007,'
    const out = parseCardsCsv(csv)
    expect(out.rows).toEqual([{ number: '', name: 'Bulbasaur', aspectRatio: '3:4', tags: [] }])
    expect(out.errors).toHaveLength(1)
  })

  it('errors on missing required headers', () => {
    const out = parseCardsCsv('foo,bar\n1,2')
    expect(out.rows).toEqual([])
    expect(out.errors[0]).toMatch(/header/i)
  })
})
