import { describe, it, expect } from 'vitest'
import { rankLocations } from '@/lib/locationAnalytics'

const base = { revenueToday: 0, revenueWeek: 0, laborToday: 0, laborPct: null, headcount: 0, activeNow: 0 }

describe('rankLocations', () => {
  it('sortuje wg rentowności (marża), karze straty i awarie', () => {
    const rows = [
      { id: 'a', name: 'A', marginPct: 70, wasteMonth: 0, openIncidents: 0, ...base },
      { id: 'b', name: 'B', marginPct: 60, wasteMonth: 400, openIncidents: 2, ...base }, // 60-20-10=30
      { id: 'c', name: 'C', marginPct: 50, wasteMonth: 0, openIncidents: 0, ...base },
    ]
    const ranked = rankLocations(rows)
    expect(ranked[0].id).toBe('a') // 70
    expect(ranked[1].id).toBe('c') // 50
    expect(ranked[2].id).toBe('b') // 30
    expect(ranked[0].score).toBe(70)
    expect(ranked[2].score).toBe(30)
  })

  it('brak marży (null) traktuje neutralnie (50)', () => {
    const ranked = rankLocations([{ id: 'x', name: 'X', marginPct: null, wasteMonth: 0, openIncidents: 0, ...base }])
    expect(ranked[0].score).toBe(50)
  })
})
