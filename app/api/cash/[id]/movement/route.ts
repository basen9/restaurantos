export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { cashMovementSchema } from '@/lib/validation'
import { addMovement } from '@/lib/cashService'

export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_CASH)
  const { type, amount, reason } = parseBody(cashMovementSchema, await req.json())
  const m = await addMovement(user, params.id, type, amount, reason)
  return NextResponse.json(m, { status: 201 })
})
