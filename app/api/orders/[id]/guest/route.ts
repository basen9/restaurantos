export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody } from '@/lib/api'
import { assignGuestSchema } from '@/lib/validation'
import { assignGuest } from '@/lib/orderService'

// Przypisanie/odpięcie gościa do rachunku (obsługa).
export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const { guestId } = parseBody(assignGuestSchema, await req.json())
  const order = await assignGuest(user, params.id, guestId)
  return NextResponse.json(order)
})
