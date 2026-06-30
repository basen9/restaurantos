import { describe, it, expect } from 'vitest'
import { buildSalesReport } from '@/lib/salesReport'

const sales = [
  { total: 40, tip: 5, discount: 10, paymentMethod: 'CARD', soldAt: new Date('2026-06-29T12:30:00'), items: [{ name: 'Stek', quantity: 2, total: 50 }] },
  { total: 20, tip: 0, discount: 0, paymentMethod: 'CASH', soldAt: new Date('2026-06-29T13:10:00'), items: [{ name: 'Stek', quantity: 1, total: 25 }, { name: 'Sok', quantity: 1, total: 10 }] },
  { total: 15, tip: 2, discount: 0, paymentMethod: 'CARD', soldAt: new Date('2026-06-29T19:00:00'), items: [{ name: 'Sok', quantity: 3, total: 30 }] },
]

describe('buildSalesReport', () => {
  const r = buildSalesReport(sales as any, 30)
  it('liczy przychód, napiwki, rabaty, średni paragon', () => {
    expect(r.revenue).toBe(75)
    expect(r.tips).toBe(7)
    expect(r.discounts).toBe(10)
    expect(r.transactions).toBe(3)
    expect(r.avgTicket).toBe(25)
  })
  it('bestsellery wg ilości', () => {
    expect(r.bestSellers[0].name).toBe('Sok') // 4 szt vs Stek 3
    expect(r.bestSellers[0].qty).toBe(4)
  })
  it('rozbicie metod płatności', () => {
    const card = r.paymentBreakdown.find((p) => p.method === 'CARD')!
    expect(card.count).toBe(2)
    expect(card.total).toBe(55)
  })
  it('sprzedaż wg godziny', () => {
    expect(r.byHour[12].revenue).toBe(40)
    expect(r.byHour[19].revenue).toBe(15)
    expect(r.byHour.length).toBe(24)
  })
})
