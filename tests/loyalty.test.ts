import { describe, it, expect } from 'vitest'
import { earnPoints, computeRedemption } from '@/lib/loyalty'

describe('loyalty', () => {
  it('earnPoints nalicza od netto', () => {
    expect(earnPoints(100, 1)).toBe(100)
    expect(earnPoints(100, 0.5)).toBe(50)
    expect(earnPoints(0, 1)).toBe(0)
    expect(earnPoints(100, 0)).toBe(0)
  })
  it('computeRedemption: ograniczone saldem', () => {
    const r = computeRedemption(500, 100, 0.05, 1000)
    expect(r.points).toBe(100)
    expect(r.discount).toBe(5) // 100 * 0.05
  })
  it('computeRedemption: ograniczone maks. rabatem (nie pobiera nadmiaru punktów)', () => {
    const r = computeRedemption(1000, 1000, 0.05, 10) // maxDiscount 10 zł
    expect(r.discount).toBe(10)
    expect(r.points).toBe(200) // 10 / 0.05
  })
  it('computeRedemption: zero gdy brak punktów/wartości', () => {
    expect(computeRedemption(100, 0, 0.05, 100)).toEqual({ points: 0, discount: 0 })
    expect(computeRedemption(0, 100, 0.05, 100)).toEqual({ points: 0, discount: 0 })
  })
})
