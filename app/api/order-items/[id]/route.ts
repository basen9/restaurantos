export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody } from '@/lib/api'
import { orderItemStatusSchema } from '@/lib/validation'
import { setItemStatus } from '@/lib/orderService'

// Zmiana statusu pozycji zamówienia (oczekuje → w przygotowaniu → gotowe → wydane).
export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const { status } = parseBody(orderItemStatusSchema, await req.json())
  const item = await setItemStatus(user, params.id, status)
  return NextResponse.json(item)
})
