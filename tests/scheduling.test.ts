import { describe, it, expect } from 'vitest'
import { avgRevenueByDow, recommendedHeadcount, assignEmployees, coverageGap } from '@/lib/scheduling'

describe('avgRevenueByDow', () => {
  it('uśrednia przychód per dzień tygodnia po unikalnych datach', () => {
    const samples = [
      { dow: 1, date: '2026-06-01', value: 1000 },
      { dow: 1, date: '2026-06-01', value: 500 }, // ta sama data → sumuje (1500)
      { dow: 1, date: '2026-06-08', value: 2500 }, // inna data
      { dow: 5, date: '2026-06-05', value: 4000 },
    ]
    const r = avgRevenueByDow(samples)
    expect(r[1]).toBe(2000) // (1500 + 2500) / 2
    expect(r[5]).toBe(4000)
    expect(r[0]).toBe(0)
  })
})

describe('recommendedHeadcount', () => {
  const p = { targetLaborPct: 0.25, avgHourlyRate: 40, shiftHours: 8 }
  it('liczy obsadę z budżetu pracy', () => {
    // 6400 * 0.25 = 1600 budżet / 40 = 40h / 8 = 5 osób
    expect(recommendedHeadcount(6400, p)).toBe(5)
  })
  it('zwraca 0 przy zerowej prognozie i min 1 przy dodatniej', () => {
    expect(recommendedHeadcount(0, p)).toBe(0)
    expect(recommendedHeadcount(100, p)).toBe(1)
  })
})

describe('assignEmployees', () => {
  it('przydziela z rotacją i nie przekracza dostępnych', () => {
    const av = ['a', 'b', 'c']
    expect(assignEmployees(av, 2, 0)).toEqual(['a', 'b'])
    expect(assignEmployees(av, 2, 1)).toEqual(['b', 'c'])
    expect(assignEmployees(av, 5, 0)).toEqual(['a', 'b', 'c'])
    expect(assignEmployees([], 3)).toEqual([])
  })
})

describe('coverageGap', () => {
  it('klasyfikuje niedobór/ok/nadmiar', () => {
    expect(coverageGap(2, 4).status).toBe('under')
    expect(coverageGap(4, 4).status).toBe('ok')
    expect(coverageGap(5, 4).status).toBe('over')
  })
})
