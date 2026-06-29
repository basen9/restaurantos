export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { confirmInvoice } from '@/lib/invoiceService'

export const POST = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY)
  const invoice = await confirmInvoice(user, params.id)
  return NextResponse.json(invoice)
})
