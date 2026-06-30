// Czysta logika lojalności — testowalna bez bazy.
const round2 = (n: number) => Math.round(n * 100) / 100

// Punkty naliczane od wartości netto rachunku.
export function earnPoints(netTotal: number, pointsPerCurrency: number): number {
  if (pointsPerCurrency <= 0 || netTotal <= 0) return 0
  return Math.round(netTotal * pointsPerCurrency)
}

// Wymiana punktów na rabat: ile punktów faktycznie zużyć i jaki rabat z tego wynika.
// Ograniczone saldem gościa, maksymalnym rabatem (np. wartość rachunku) i wartością punktu.
export function computeRedemption(
  requestedPoints: number,
  guestPoints: number,
  redeemValue: number,
  maxDiscount: number,
): { points: number; discount: number } {
  if (requestedPoints <= 0 || guestPoints <= 0 || redeemValue <= 0 || maxDiscount <= 0) return { points: 0, discount: 0 }
  let points = Math.min(Math.floor(requestedPoints), guestPoints)
  let discount = round2(points * redeemValue)
  if (discount > maxDiscount) {
    discount = round2(maxDiscount)
    points = Math.floor(discount / redeemValue) // nie pobieraj więcej punktów niż faktycznie wykorzystany rabat
    discount = round2(points * redeemValue)
  }
  return { points, discount }
}
