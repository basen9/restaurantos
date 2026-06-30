export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { cashCloseSchema } from '@/lib/validation'
import { closeSession } from '@/lib/cashService'

export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_CASH)
  const { countedCash, notes } = parseBody(cashCloseSchema, await req.json())
  const session = await closeSession(user, params.id, countedCash, notes)
  return NextResponse.json(session)
})
