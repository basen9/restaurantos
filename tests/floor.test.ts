import { describe, it, expect } from 'vitest'
import { orderTotal, minutesSince, oldestUnservedMin, summarizeOrder } from '@/lib/floor'

const now = new Date('2026-06-29T12:00:00Z').getTime()
const ago = (min: number) => new Date(now - min * 60000)

describe('floor helpers', () => {
  it('orderTotal sumuje ilość×cena z zaokrągleniem do groszy', () => {
    expect(orderTotal([{ quantity: 2, unitPrice: 12.5 }, { quantity: 1, unitPrice: 3.33 }])).toBe(28.33)
  })
  it('minutesSince liczy wiek w minutach (nieujemnie)', () => {
    expect(minutesSince(ago(15), now)).toBe(15)
    expect(minutesSince(new Date(now + 60000), now)).toBe(0)
  })
  it('oldestUnservedMin pomija wydane pozycje', () => {
    const items = [
      { quantity: 1, unitPrice: 1, status: 'SERVED', createdAt: ago(40) },
      { quantity: 1, unitPrice: 1, status: 'PENDING', createdAt: ago(12) },
    ]
    expect(oldestUnservedMin(items, now)).toBe(12)
  })
  it('oldestUnservedMin = null gdy wszystko wydane', () => {
    expect(oldestUnservedMin([{ quantity: 1, unitPrice: 1, status: 'SERVED', createdAt: ago(5) }], now)).toBeNull()
  })
  it('orderTotal i summarizeOrder pomijają pozycje wystornowane', () => {
    const items = [
      { quantity: 1, unitPrice: 100, status: 'SERVED', createdAt: ago(5) },
      { quantity: 1, unitPrice: 50, status: 'PENDING', voided: true, createdAt: ago(3) },
    ]
    expect(orderTotal(items)).toBe(100)
    const s = summarizeOrder(items, now)
    expect(s.total).toBe(100)
    expect(s.itemCount).toBe(1)
    expect(s.pending).toBe(0)
  })

  it('summarizeOrder zlicza pozycje i statusy', () => {
    const s = summarizeOrder([
      { quantity: 2, unitPrice: 10, status: 'PENDING', createdAt: ago(5) },
      { quantity: 1, unitPrice: 5, status: 'READY', createdAt: ago(3) },
    ], now)
    expect(s.itemCount).toBe(3)
    expect(s.total).toBe(25)
    expect(s.pending).toBe(1)
    expect(s.ready).toBe(1)
  })
})
