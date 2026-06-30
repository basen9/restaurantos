import { describe, it, expect } from 'vitest'
import { vatFromGross, orderVat, vatBreakdown } from '@/lib/tax'

describe('tax (VAT z ceny brutto)', () => {
  it('vatFromGross: 8% z 108 = 8', () => {
    expect(vatFromGross(108, 8)).toBe(8)
  })
  it('vatFromGross: 23% z 123 = 23', () => {
    expect(vatFromGross(123, 23)).toBe(23)
  })
  it('vatFromGross: stawka 0 → 0', () => {
    expect(vatFromGross(100, 0)).toBe(0)
  })
  it('orderVat koryguje o rabat (factor)', () => {
    const items = [{ quantity: 1, unitPrice: 108, vatRate: 8 }]
    expect(orderVat(items, 1)).toBe(8)
    expect(orderVat(items, 0.5)).toBe(4)
  })
  it('vatBreakdown grupuje wg stawki', () => {
    const b = vatBreakdown([
      { quantity: 1, unitPrice: 108, vatRate: 8 },
      { quantity: 1, unitPrice: 123, vatRate: 23 },
    ])
    expect(b.find((x) => x.rate === 8)!.vat).toBe(8)
    expect(b.find((x) => x.rate === 23)!.net).toBe(100)
  })
})
