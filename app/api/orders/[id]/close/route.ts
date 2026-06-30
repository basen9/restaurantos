export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { closeOrderSchema } from '@/lib/validation'
import { closeOrder } from '@/lib/orderService'

// Zamknięcie rachunku → utworzenie sprzedaży (przychód). Wymaga uprawnienia
// (tworzy rekord finansowy) — spójnie z gatingiem ręcznej sprzedaży.
export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORDERS)
  // Body opcjonalne (rabat/napiwek/metoda/podział).
  const raw = await req.text()
  const opts = raw ? parseBody(closeOrderSchema, JSON.parse(raw)) : {}
  const order = await closeOrder(user, params.id, opts)
  return NextResponse.json(order)
})
