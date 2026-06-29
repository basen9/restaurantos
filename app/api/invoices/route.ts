export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { invoiceManualSchema } from '@/lib/validation'
import { createInvoiceWithMatches } from '@/lib/invoiceService'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY)
  const invoices = await prisma.invoice.findMany({
    where: orgScope(user),
    include: { items: { include: { inventoryItem: { select: { id: true, name: true } } } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 40,
  })
  return NextResponse.json(invoices)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY)
  const data = parseBody(invoiceManualSchema, await req.json())
  const invoice = await createInvoiceWithMatches(user, { ...data, source: 'MANUAL' })
  return NextResponse.json(invoice, { status: 201 })
})
