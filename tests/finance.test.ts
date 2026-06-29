import { describe, it, expect } from 'vitest'
import { cogsFor } from '@/lib/finance'

describe('cogsFor', () => {
  const costMap = new Map<string, number>([
    ['p1', 2],
    ['p2', 5],
  ])

  it('sumuje koszt wytworzenia wg ilości i mapy kosztów', () => {
    const items = [
      { productId: 'p1', quantity: 3 }, // 6
      { productId: 'p2', quantity: 2 }, // 10
    ]
    expect(cogsFor(items, costMap)).toBe(16)
  })

  it('ignoruje pozycje bez productId lub spoza mapy', () => {
    const items = [
      { productId: null, quantity: 5 },
      { productId: 'unknown', quantity: 5 },
      { productId: 'p1', quantity: 1 },
    ]
    expect(cogsFor(items, costMap)).toBe(2)
  })

  it('zwraca 0 dla pustej listy', () => {
    expect(cogsFor([], costMap)).toBe(0)
  })
})
