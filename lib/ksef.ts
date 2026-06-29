// Konektor KSeF (Krajowy System e-Faktur). Abstrakcja gotowa pod realne API gov;
// dziś provider 'mock' generuje przykładowe faktury zakupowe do pipeline'u.
// Realna integracja wymaga certyfikatu/tokenu KSeF i środowiska gov (test/prod).
import type { ParsedLine } from './invoices'

export interface KsefInvoice {
  externalId: string
  number: string
  supplierName: string
  issueDate: string
  items: ParsedLine[]
}

export interface KsefProvider {
  fetchInvoices(sinceISO: string): Promise<KsefInvoice[]>
}

// Mock: faktura od dostawcy z cenami nieco innymi niż w magazynie (demonstruje aktualizację cen).
export const mockKsefProvider: KsefProvider = {
  async fetchInvoices() {
    const today = new Date().toISOString().slice(0, 10)
    return [
      {
        externalId: `KSEF-${today}-001`,
        number: `FV/${today}/12`,
        supplierName: 'Hurtownia Smaku',
        issueDate: today,
        items: [
          { name: 'Mąka pszenna typ 550', quantity: 25, unit: 'kg', unitPrice: 3.4 },
          { name: 'Masło 82%', quantity: 10, unit: 'kg', unitPrice: 34.5 },
        ],
      },
    ]
  },
}

export function getKsefProvider(_provider: string): KsefProvider {
  // miejsce na realnych providerów (np. oficjalne API KSeF)
  return mockKsefProvider
}
