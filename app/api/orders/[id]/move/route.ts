export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { moveOrderSchema } from '@/lib/validation'
import { moveOrder } from '@/lib/orderService'

// Przeniesienie / połączenie rachunku (obsługa kelnerska — wymaga MANAGE_ORDERS).
export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORDERS)
  const { tableId } = parseBody(moveOrderSchema, await req.json())
  const result = await moveOrder(user, params.id, tableId)
  return NextResponse.json(result)
})
