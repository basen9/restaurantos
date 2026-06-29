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

// Zwraca dla każdej linii faktury dopasowany inventoryItemId (lub null).
// Dopasowanie: pełna równość znormalizowanej nazwy, potem zawieranie tokenów.
export function matchInvoiceLines(lines: ParsedLine[], items: InventoryRef[]): (ParsedLine & { inventoryItemId: string | null })[] {
  const norm = items.map((i) => ({ id: i.id, n: normalizeName(i.name) }))
  return lines.map((line) => {
    const ln = normalizeName(line.name)
    let match = norm.find((i) => i.n === ln)
    if (!match) match = norm.find((i) => i.n.length > 2 && (ln.includes(i.n) || i.n.includes(ln)))
    if (!match) {
      const tokens = ln.split(' ').filter((t) => t.length > 2)
      match = norm.find((i) => tokens.length > 0 && tokens.every((t) => i.n.includes(t)))
    }
    return { ...line, inventoryItemId: match ? match.id : null }
  })
}
