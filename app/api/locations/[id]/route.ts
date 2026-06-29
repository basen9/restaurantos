export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { locationUpdateSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(locationUpdateSchema, await req.json())
  const loc = await prisma.location.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!loc) throw new ApiError(404, 'Location not found')
  const updated = await prisma.location.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
})
