// Czysta logika rozliczenia kasy — testowalna bez bazy.
const round2 = (n: number) => Math.round(n * 100) / 100

export interface CashMovementLike { type: 'IN' | 'OUT'; amount: number }

export function sumMovements(movements: CashMovementLike[]) {
  const paidIn = round2(movements.filter((m) => m.type === 'IN').reduce((s, m) => s + m.amount, 0))
  const paidOut = round2(movements.filter((m) => m.type === 'OUT').reduce((s, m) => s + m.amount, 0))
  return { paidIn, paidOut }
}

// Oczekiwana gotówka w szufladzie = bilon + sprzedaż gotówką + wpłaty − wypłaty.
export function expectedCash(openingFloat: number, cashSales: number, paidIn: number, paidOut: number): number {
  return round2(openingFloat + cashSales + paidIn - paidOut)
}

// Różnica kasowa: dodatnia = nadwyżka, ujemna = niedobór.
export function cashVariance(countedCash: number, expected: number): number {
  return round2(countedCash - expected)
}
