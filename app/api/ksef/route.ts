export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { getKsefProvider } from '@/lib/ksef'
import { createInvoiceWithMatches } from '@/lib/invoiceService'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const conn = await prisma.ksefConnection.findUnique({ where: { organizationId: user.organizationId } })
  return NextResponse.json(conn || { connected: false, environment: null, lastSyncAt: null })
})

// Mock-sync: pobiera faktury z KSeF (provider mock) i tworzy je jako PENDING.
export const POST = handle(async () => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY)
  const provider = getKsefProvider('mock')
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const invoices = await provider.fetchInvoices(since)

  let imported = 0
  for (const inv of invoices) {
    const exists = await prisma.invoice.findFirst({ where: { organizationId: user.organizationId, externalId: inv.externalId }, select: { id: true } })
    await createInvoiceWithMatches(user, {
      number: inv.number,
      supplierName: inv.supplierName,
      issueDate: new Date(inv.issueDate),
      source: 'KSEF',
      externalId: inv.externalId,
      items: inv.items,
    })
    if (!exists) imported++
  }

  const conn = await prisma.ksefConnection.upsert({
    where: { organizationId: user.organizationId },
    update: { connected: true, lastSyncAt: new Date() },
    create: { organizationId: user.organizationId, connected: true, environment: 'test', lastSyncAt: new Date() },
  })
  await audit(user, 'ksef.sync', 'KsefConnection', conn.id, { imported })
  return NextResponse.json({ ok: true, imported, connection: conn })
})
