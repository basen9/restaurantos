export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth } from '@/lib/api'
import { closeOrder } from '@/lib/orderService'

// Zamknięcie rachunku → utworzenie sprzedaży (przychód).
export const POST = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const order = await closeOrder(user, params.id)
  return NextResponse.json(order)
})
