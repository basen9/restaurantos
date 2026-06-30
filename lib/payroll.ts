// Czysta agregacja płac z przepracowanych zmian — testowalna bez bazy.
import { shiftMinutes } from './finance'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface PayrollShift {
  userId: string
  userName: string
  hourlyRate: number
  actualStart: Date | null
  actualEnd: Date | null
  status: string
  startTime: string | null
  endTime: string | null
}

export interface PayrollRow {
  userId: string
  name: string
  shifts: number
  hours: number
  hourlyRate: number
  gross: number
}

// Sumuje godziny i wynagrodzenie brutto per pracownik. Liczone tylko zmiany zakończone.
export function computePayroll(shifts: PayrollShift[]): PayrollRow[] {
  const map = new Map<string, PayrollRow & { minutes: number }>()
  for (const s of shifts) {
    const mins = shiftMinutes(s)
    const e = map.get(s.userId) || { userId: s.userId, name: s.userName, shifts: 0, hours: 0, minutes: 0, hourlyRate: s.hourlyRate, gross: 0 }
    e.shifts += 1
    e.minutes += mins
    e.hourlyRate = s.hourlyRate
    map.set(s.userId, e)
  }
  return Array.from(map.values())
    .map((e) => ({ userId: e.userId, name: e.name, shifts: e.shifts, hours: round2(e.minutes / 60), hourlyRate: e.hourlyRate, gross: round2((e.minutes / 60) * e.hourlyRate) }))
    .sort((a, b) => b.gross - a.gross)
}
