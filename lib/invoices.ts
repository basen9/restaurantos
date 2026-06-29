// Dopasowanie pozycji faktury do pozycji magazynowych (po znormalizowanej nazwie).
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l') // ł nie rozkłada się przez NFD
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // usuń diakrytyki
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface ParsedLine {
  name: string
  quantity: number
  unit: string
  unitPrice: number
}

export interface InventoryRef {
  id: string
  name: string
}

// Siła dopasowania linii faktury (ln) do nazwy pozycji magazynowej (n).
// Wyższy wynik = pewniejsze dopasowanie. 0 = brak.
// Rankingowe (nie "pierwsze trafienie") — eliminuje błędne mapowania zależne od kolejności
// (np. "ser" połykający "deser", albo "mleko" trafiające w pierwsze z wielu "mleko ...").
function matchScore(ln: string, n: string): number {
  if (!ln || !n) return 0
  if (ln === n) return 1000
  const lt = ln.split(' ').filter((t) => t.length > 2)
  const nt = n.split(' ').filter((t) => t.length > 2)
  const common = lt.filter((t) => nt.includes(t)).length
  if (lt.length && common === lt.length) return 600 + common // wszystkie tokeny faktury są w pozycji
  if (nt.length && common === nt.length) return 500 + common // wszystkie tokeny pozycji są w fakturze
  // Świadomie NIE dopasowujemy po pojedynczym wspólnym tokenie (np. "olej") — zbyt słabe,
  // a wynik steruje przyjęciem na stan i ceną. Słabe trafienia zostają do ręcznego potwierdzenia.
  // Zawieranie całych ciągów — tylko przy istotnym pokryciu długości (próg 0.7),
  // by krótka nazwa nie "połykała" niepowiązanej dłuższej.
  if (ln.includes(n) || n.includes(ln)) {
    const ratio = Math.min(ln.length, n.length) / Math.max(ln.length, n.length)
    if (ratio >= 0.7) return 40 + Math.round(ratio * 10)
  }
  return 0
}

// Zwraca dla każdej linii faktury najlepiej dopasowany inventoryItemId (lub null).
export function matchInvoiceLines(lines: ParsedLine[], items: InventoryRef[]): (ParsedLine & { inventoryItemId: string | null })[] {
  const norm = items.map((i) => ({ id: i.id, n: normalizeName(i.name) }))
  return lines.map((line) => {
    const ln = normalizeName(line.name)
    let bestId: string | null = null
    let bestScore = 0
    for (const i of norm) {
      const s = matchScore(ln, i.n)
      if (s > bestScore) { bestScore = s; bestId = i.id }
    }
    return { ...line, inventoryItemId: bestId }
  })
}
