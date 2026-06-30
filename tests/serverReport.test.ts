import { describe, it, expect } from 'vitest'
import { buildServerReport } from '@/lib/serverReport'

const sales = [
  { serverId: 'a', serverName: 'Ala', total: 100, tip: 10 },
  { serverId: 'a', serverName: 'Ala', total: 50, tip: 5 },
  { serverId: 'b', serverName: 'Bartek', total: 80, tip: 8 },
]

describe('buildServerReport', () => {
  it('individual: napiwki przypisane do kelnera', () => {
    const r = buildServerReport(sales as any, 'individual')
    const ala = r.rows.find((x) => x.serverId === 'a')!
    expect(ala.sales).toBe(2)
    expect(ala.revenue).toBe(150)
    expect(ala.tips).toBe(15)
    expect(ala.avgTicket).toBe(75)
    expect(r.tipPool).toBe(23)
  })
  it('pooled: napiwki dzielone równo wg liczby kelnerów', () => {
    const r = buildServerReport(sales as any, 'pooled')
    // pula 23 / 2 kelnerów = 11.5 każdy
    expect(r.rows.every((x) => x.tips === 11.5)).toBe(true)
  })
  it('sortuje malejąco wg przychodu', () => {
    const r = buildServerReport(sales as any, 'individual')
    expect(r.rows[0].serverId).toBe('a')
  })
})
