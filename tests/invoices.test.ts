import { describe, it, expect } from 'vitest'
import { normalizeName, matchInvoiceLines } from '@/lib/invoices'
import { parseInvoiceJson } from '@/lib/ocr'

describe('normalizeName', () => {
  it('usuwa diakrytyki, wielkość liter i znaki specjalne', () => {
    expect(normalizeName('Mąka Pszenna TYP 550')).toBe('maka pszenna typ 550')
    expect(normalizeName('Masło 82%')).toBe('maslo 82')
  })
})

describe('matchInvoiceLines', () => {
  const items = [
    { id: 'a', name: 'Mąka pszenna typ 550' },
    { id: 'b', name: 'Masło 82%' },
  ]
  it('dopasowuje po znormalizowanej nazwie (równość i zawieranie)', () => {
    const res = matchInvoiceLines(
      [
        { name: 'maka pszenna typ 550', quantity: 25, unit: 'kg', unitPrice: 3.4 },
        { name: 'Masło 82 %', quantity: 10, unit: 'kg', unitPrice: 34 },
        { name: 'Coś zupełnie innego', quantity: 1, unit: 'szt', unitPrice: 5 },
      ],
      items,
    )
    expect(res[0].inventoryItemId).toBe('a')
    expect(res[1].inventoryItemId).toBe('b')
    expect(res[2].inventoryItemId).toBeNull()
  })
})

describe('parseInvoiceJson', () => {
  it('wyciąga JSON z odpowiedzi modelu i filtruje niepełne pozycje', () => {
    const text = 'Oto dane:\n{"number":"FV/1","supplierName":"X","items":[{"name":"Mąka","quantity":10,"unit":"kg","unitPrice":3},{"name":"","quantity":5,"unit":"kg","unitPrice":2}]}\nDziękuję.'
    const out = parseInvoiceJson(text)
    expect(out.number).toBe('FV/1')
    expect(out.items).toHaveLength(1)
    expect(out.items[0].name).toBe('Mąka')
  })
  it('rzuca błąd gdy brak JSON', () => {
    expect(() => parseInvoiceJson('brak danych')).toThrow()
  })
})
