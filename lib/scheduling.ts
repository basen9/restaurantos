// Inteligentna optymalizacja grafików: prognoza popytu (z historii sprzedaży)
// → rekomendowana obsada → propozycja zmian z uwzględnieniem dostępności i budżetu pracy.

// Średni przychód per dzień tygodnia (indeks JS getDay: 0=niedz .. 6=sob).
// samples: lista {dow, date(YYYY-MM-DD), value} — uśredniamy po unikalnych datach.
export function avgRevenueByDow(samples: { dow: number; date: string; value: number }[]): number[] {
  const byDow: Record<number, Map<string, number>> = {}
  for (const s of samples) {
    byDow[s.dow] = byDow[s.dow] || new Map()
    byDow[s.dow].set(s.date, (byDow[s.dow].get(s.date) || 0) + s.value)
  }
  const out = Array(7).fill(0)
  for (let d = 0; d < 7; d++) {
    const m = byDow[d]
    if (!m || m.size === 0) { out[d] = 0; continue }
    const total = Array.from(m.values()).reduce((a, b) => a + b, 0)
    out[d] = Math.round(total / m.size)
  }
  return out
}

export interface StaffingParams {
  targetLaborPct: number // np. 0.25
  avgHourlyRate: number // np. 35
  shiftHours: number // np. 8
}

// Rekomendowana liczba osób na dzień przy danym prognozowanym przychodzie.
export function recommendedHeadcount(forecastRevenue: number, p: StaffingParams): number {
  if (forecastRevenue <= 0) return 0
  if (p.avgHourlyRate <= 0 || p.shiftHours <= 0) return 1
  const budget = forecastRevenue * p.targetLaborPct
  const hours = budget / p.avgHourlyRate
  return Math.max(1, Math.round(hours / p.shiftHours))
}

// Sprawiedliwy przydział: wybiera `count` osób z dostępnych, rotując wg offsetu.
export function assignEmployees(available: string[], count: number, rotationOffset = 0): string[] {
  if (count <= 0 || available.length === 0) return []
  const out: string[] = []
  for (let i = 0; i < Math.min(count, available.length); i++) {
    out.push(available[(rotationOffset + i) % available.length])
  }
  return out
}

// Pokrycie: porównanie zaplanowanej obsady z rekomendowaną (per dzień).
export function coverageGap(planned: number, recommended: number): { gap: number; status: 'under' | 'ok' | 'over' } {
  const gap = planned - recommended
  return { gap, status: gap < 0 ? 'under' : gap > 0 ? 'over' : 'ok' }
}
