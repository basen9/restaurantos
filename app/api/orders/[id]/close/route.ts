export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { closeOrder } from '@/lib/orderService'

// Zamknięcie rachunku → utworzenie sprzedaży (przychód). Wymaga uprawnienia
// (tworzy rekord finansowy) — spójnie z gatingiem ręcznej sprzedaży.
export const POST = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORDERS)
  const order = await closeOrder(user, params.id)
  return NextResponse.json(order)
})
