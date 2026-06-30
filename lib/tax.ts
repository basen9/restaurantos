// Czysta logika VAT. Ceny są BRUTTO (zawierają VAT) — standard gastronomii PL.
// VAT zawarty w cenie brutto = brutto * stawka / (100 + stawka).
const round2 = (n: number) => Math.round(n * 100) / 100

export function vatFromGross(gross: number, ratePct: number): number {
  if (ratePct <= 0) return 0
  return round2((gross * ratePct) / (100 + ratePct))
}

export interface TaxLine { quantity: number; unitPrice: number; vatRate: number }

// Łączny VAT zamówienia (brutto pozycji), skorygowany o czynnik rabatu (netto/subtotal).
export function orderVat(items: TaxLine[], discountFactor = 1): number {
  const raw = items.reduce((s, i) => s + vatFromGross(i.quantity * i.unitPrice, i.vatRate), 0)
  return round2(raw * discountFactor)
}

// Rozbicie podatku wg stawki: { rate, gross, net, vat } — dla raportu księgowego.
export function vatBreakdown(items: TaxLine[]): { rate: number; gross: number; net: number; vat: number }[] {
  const map = new Map<number, { rate: number; gross: number; vat: number }>()
  for (const i of items) {
    const gross = i.quantity * i.unitPrice
    const e = map.get(i.vatRate) || { rate: i.vatRate, gross: 0, vat: 0 }
    e.gross += gross
    e.vat += vatFromGross(gross, i.vatRate)
    map.set(i.vatRate, e)
  }
  return Array.from(map.values())
    .map((e) => ({ rate: e.rate, gross: round2(e.gross), vat: round2(e.vat), net: round2(e.gross - e.vat) }))
    .sort((a, b) => a.rate - b.rate)
}
