export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { cashOpenSchema } from '@/lib/validation'
import { openSession } from '@/lib/cashService'
import { prisma } from '@/lib/prisma'

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_CASH)
  const { openingFloat, locationId } = parseBody(cashOpenSchema, await req.json())
  if (locationId) {
    const loc = await prisma.location.findFirst({ where: { id: locationId, ...orgScope(user) }, select: { id: true } })
    if (!loc) throw new ApiError(400, 'Nieprawidłowy lokal')
  }
  const session = await openSession(user, openingFloat, locationId)
  return NextResponse.json(session, { status: 201 })
})
