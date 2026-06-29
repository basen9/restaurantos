// OCR faktur przez Claude Vision — ekstrakcja ustrukturyzowanych pozycji ze zdjęcia/PDF-jpg.
import type { ParsedLine } from './invoices'

export interface ExtractedInvoice {
  number?: string
  supplierName?: string
  issueDate?: string
  items: ParsedLine[]
}

const PROMPT = `Wyodrębnij dane z tej faktury zakupowej. Zwróć WYŁĄCZNIE poprawny JSON (bez markdown) w formacie:
{"number":"...","supplierName":"...","issueDate":"YYYY-MM-DD","items":[{"name":"...","quantity":0,"unit":"kg","unitPrice":0}]}
Zasady: unitPrice = cena netto za jednostkę. Jeśli pola brak, pomiń je. Nie zmyślaj pozycji.`

export async function extractInvoice(apiKey: string, imageBase64: string, mediaType: string): Promise<ExtractedInvoice> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  })
  if (!res.ok) throw new Error('Vision provider error')
  const data = await res.json()
  const text: string = data.content?.[0]?.text || ''
  return parseInvoiceJson(text)
}

// Wydzielone do testów: wyciąga i normalizuje JSON z odpowiedzi modelu.
export function parseInvoiceJson(text: string): ExtractedInvoice {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Brak JSON w odpowiedzi OCR')
  const obj = JSON.parse(text.slice(start, end + 1))
  const items: ParsedLine[] = Array.isArray(obj.items)
    ? obj.items
        .map((it: any) => ({
          name: String(it.name || '').trim(),
          quantity: Number(it.quantity) || 0,
          unit: String(it.unit || 'szt'),
          unitPrice: Number(it.unitPrice) || 0,
        }))
        .filter((it: ParsedLine) => it.name && it.quantity > 0)
    : []
  return { number: obj.number, supplierName: obj.supplierName, issueDate: obj.issueDate, items }
}
