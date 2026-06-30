import { describe, it, expect } from 'vitest'
import { sumMovements, expectedCash, cashVariance } from '@/lib/cash'

describe('cash drawer', () => {
  it('sumuje wpłaty i wypłaty', () => {
    const { paidIn, paidOut } = sumMovements([{ type: 'IN', amount: 50 }, { type: 'OUT', amount: 20 }, { type: 'OUT', amount: 5 }])
    expect(paidIn).toBe(50)
    expect(paidOut).toBe(25)
  })
  it('oczekiwana gotówka = bilon + sprzedaż + wpłaty − wypłaty', () => {
    expect(expectedCash(200, 1000, 50, 25)).toBe(1225)
  })
  it('różnica kasowa: niedobór ujemny, nadwyżka dodatnia', () => {
    expect(cashVariance(1220, 1225)).toBe(-5)
    expect(cashVariance(1230, 1225)).toBe(5)
    expect(cashVariance(1225, 1225)).toBe(0)
  })
})
