export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody } from '@/lib/api'
import { orderAddItemsSchema } from '@/lib/validation'
import { getOpenOrder, addItems } from '@/lib/orderService'

// Bieżący otwarty rachunek stolika (na żywo).
export const GET = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const order = await getOpenOrder(user, params.id)
  return NextResponse.json(order)
})

// Dodanie pozycji (otwiera rachunek, jeśli trzeba).
export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const { items } = parseBody(orderAddItemsSchema, await req.json())
  const order = await addItems(user, params.id, items)
  return NextResponse.json(order, { status: 201 })
})
