import { describe, it, expect } from 'vitest'
import { buildAlertsFromSnapshot, buildSlowServiceAlert } from '@/lib/alertsEngine'

const snap = (over: any = {}): any => ({
  date: '2026-06-29',
  finance: { posConnected: true, salesToday: 5000, profitToday: 1000, marginPct: 55, foodCostActualPct: 41, laborCostPct: 33, ...(over.finance || {}) },
  variance: [],
  waste: { month: 100, topProducts: [] },
  foodCost: { avgPct: 20, worst: [] },
  inventory: { lowStock: over.lowStock ?? [{ name: 'Mąka', stock: 2, minStock: 10, unit: 'kg', estOrderCost: 50 }], orderTotal: 50 },
  attention: { openIncidents: over.openIncidents ?? 1, pendingVacations: over.pendingVacations ?? 0, openTasks: 0 },
  team: { employees: 3, activeNow: 1 },
})

describe('buildAlertsFromSnapshot', () => {
  it('generuje alerty dla awarii, niskiego stanu, food cost i kosztu pracy', () => {
    const alerts = buildAlertsFromSnapshot(snap(), [])
    const types = alerts.map((a) => a.type)
    expect(types).toContain('incidents')
    expect(types).toContain('low_stock')
    expect(types).toContain('food_cost')
    expect(types).toContain('labor')
  })

  it('dedupeKey zawiera dzień (idempotencja dobowa)', () => {
    const alerts = buildAlertsFromSnapshot(snap(), [])
    expect(alerts.every((a) => a.dedupeKey.includes('2026-06-29'))).toBe(true)
  })

  it('food cost i labor pomijane bez POS', () => {
    const alerts = buildAlertsFromSnapshot(snap({ finance: { posConnected: false, foodCostActualPct: 41, laborCostPct: 33 }, openIncidents: 0, lowStock: [] }), [])
    expect(alerts.map((a) => a.type)).not.toContain('food_cost')
    expect(alerts.map((a) => a.type)).not.toContain('labor')
  })

  it('dodaje alert wariancji powyżej progu', () => {
    const alerts = buildAlertsFromSnapshot(snap({ openIncidents: 0, lowStock: [] }), [{ name: 'Masło', variance: 2, unit: 'kg', varianceCost: 64 }])
    expect(alerts.map((a) => a.type)).toContain('variance')
  })
})

describe('buildSlowServiceAlert', () => {
  const now = new Date('2026-06-29T12:00:00Z').getTime()
  const ago = (m: number) => new Date(now - m * 60000)
  it('alarmuje gdy stolik czeka >= próg (pomija wydane/storno)', () => {
    const orders = [
      { tableName: 'W1', items: [{ status: 'PENDING', createdAt: ago(25) }] },
      { tableName: 'W2', items: [{ status: 'SERVED', createdAt: ago(40) }] },
    ]
    const a = buildSlowServiceAlert(orders, 20, now, '2026-06-29')
    expect(a?.type).toBe('slow_service')
    expect(a?.title).toContain('1 stolik')
  })
  it('brak alertu gdy poniżej progu', () => {
    const orders = [{ tableName: 'W1', items: [{ status: 'PENDING', createdAt: ago(5) }] }]
    expect(buildSlowServiceAlert(orders, 20, now, '2026-06-29')).toBeNull()
  })
})
