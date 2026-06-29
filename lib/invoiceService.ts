// Serwis faktur: tworzenie z auto-dopasowaniem do magazynu + zatwierdzanie
// (aktualizacja ostatniej ceny zakupu, przyjęcie na stan jako StockMovement PURCHASE).
import { prisma } from './prisma'
import { matchInvoiceLines, type ParsedLine } from './invoices'
import { audit } from './audit'
import { ApiError, type AuthUser } from './api'

const round2 = (n: number) => Math.round(n * 100) / 100

export async function createInvoiceWithMatches(
  user: Pick<AuthUser, 'id' | 'organizationId'>,
  input: { number?: string; supplierName?: string; supplierId?: string; issueDate?: Date; source: 'MANUAL' | 'OCR' | 'KSEF'; externalId?: string; items: ParsedLine[] },
) {
  // Idempotencja dla KSeF (po externalId).
  if (input.externalId) {
    const existing = await prisma.invoice.findFirst({ where: { organizationId: user.organizationId, externalId: input.externalId } })
    if (existing) return existing
  }

  const items = await prisma.inventoryItem.findMany({ where: { organizationId: user.organizationId, isActive: true }, select: { id: true, name: true } })
  const matched = matchInvoiceLines(input.items, items)
  const total = round2(matched.reduce((s, l) => s + l.quantity * l.unitPrice, 0))

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: user.organizationId,
      supplierId: input.supplierId || null,
      number: input.number,
      supplierName: input.supplierName,
      issueDate: input.issueDate,
      source: input.source,
      externalId: input.externalId,
      total,
      items: {
        create: matched.map((l) => ({ inventoryItemId: l.inventoryItemId, name: l.name, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPrice, total: round2(l.quantity * l.unitPrice) })),
      },
    },
    include: { items: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } } },
  })
  await audit(user, 'invoice.create', 'Invoice', invoice.id, { source: input.source, total, matched: matched.filter((m) => m.inventoryItemId).length })
  return invoice
}

export async function confirmInvoice(user: Pick<AuthUser, 'id' | 'organizationId'>, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: user.organizationId }, include: { items: true } })
  if (!invoice) throw new ApiError(404, 'Invoice not found')
  if (invoice.status === 'CONFIRMED') return invoice

  await prisma.$transaction(async (tx) => {
    for (const li of invoice.items) {
      if (!li.inventoryItemId) continue
      // Aktualizacja ostatniej ceny zakupu + przyjęcie na stan.
      await tx.inventoryItem.update({ where: { id: li.inventoryItemId }, data: { costPerUnit: li.unitPrice, stock: { increment: li.quantity } } })
      await tx.stockMovement.create({
        data: { organizationId: user.organizationId, inventoryItemId: li.inventoryItemId, userId: user.id, type: 'PURCHASE', quantity: li.quantity, unitCost: li.unitPrice, reason: `Faktura ${invoice.number || invoice.id}` },
      })
    }
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } })
  })

  await audit(user, 'invoice.confirm', 'Invoice', invoice.id, { matched: invoice.items.filter((i) => i.inventoryItemId).length, total: invoice.total })
  return prisma.invoice.findUnique({ where: { id: invoice.id }, include: { items: true } })
}
