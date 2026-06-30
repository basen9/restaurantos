// Czysta logika VAT. Ceny są BRUTTO (zawierają VAT) — standard gastronomii PL.
// VAT zawarty w cenie brutto = brutto * stawka / (100 + stawka).
const round2 = (n: number) => Math.round(n * 100) / 100

export function vatFromGross(gross: number, ratePct: number): number {
  if (ratePct <= 0) return 0
  return round2((gross * ratePct) / (100 + ratePct))
}

// Rozbicie VAT wg stawki z kwot BRUTTO (jedno źródło prawdy dla zamknięcia i raportu).
// Agregujemy brutto per stawka, zaokrąglamy raz — spójne, bez kumulacji błędów per-linia.
export function vatBreakdownGross(lines: { gross: number; vatRate: number }[]): { rate: number; gross: number; net: number; vat: number }[] {
  const map = new Map<number, number>()
  for (const l of lines) map.set(l.vatRate, (map.get(l.vatRate) || 0) + l.gross)
  return Array.from(map.entries())
    .map(([rate, grossSum]) => {
      const gross = round2(grossSum)
      const vat = vatFromGross(gross, rate)
      return { rate, gross, vat, net: round2(gross - vat) }
    })
    .sort((a, b) => a.rate - b.rate)
}

// Łączny VAT z kwot brutto (suma rozbicia per stawka — zgodne z vatBreakdownGross).
export function totalVatGross(lines: { gross: number; vatRate: number }[]): number {
  return round2(vatBreakdownGross(lines).reduce((s, b) => s + b.vat, 0))
}

export interface TaxLine { quantity: number; unitPrice: number; vatRate: number }

// Wygodne nakładki dla pozycji ilość×cena.
export function vatBreakdown(items: TaxLine[]) {
  return vatBreakdownGross(items.map((i) => ({ gross: i.quantity * i.unitPrice, vatRate: i.vatRate })))
}
export function orderVat(items: TaxLine[], discountFactor = 1): number {
  return totalVatGross(items.map((i) => ({ gross: round2(i.quantity * i.unitPrice * discountFactor), vatRate: i.vatRate })))
}
