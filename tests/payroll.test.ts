import { describe, it, expect } from 'vitest'
import { computePayroll } from '@/lib/payroll'

const s = (userId: string, name: string, rate: number, h: number) => ({
  userId, userName: name, hourlyRate: rate, status: 'COMPLETED',
  actualStart: new Date('2026-06-29T08:00:00'), actualEnd: new Date(`2026-06-29T${String(8 + h).padStart(2, '0')}:00:00`),
  startTime: null, endTime: null,
})

describe('computePayroll', () => {
  it('sumuje godziny i brutto per pracownik', () => {
    const rows = computePayroll([s('u1', 'Anna', 30, 8), s('u1', 'Anna', 30, 4), s('u2', 'Marek', 25, 6)])
    const anna = rows.find((r) => r.userId === 'u1')!
    expect(anna.shifts).toBe(2)
    expect(anna.hours).toBe(12)
    expect(anna.gross).toBe(360) // 12h × 30
    const marek = rows.find((r) => r.userId === 'u2')!
    expect(marek.gross).toBe(150) // 6h × 25
  })
  it('sortuje malejąco wg brutto', () => {
    const rows = computePayroll([s('u2', 'Marek', 25, 6), s('u1', 'Anna', 30, 8)])
    expect(rows[0].userId).toBe('u1')
  })
})
