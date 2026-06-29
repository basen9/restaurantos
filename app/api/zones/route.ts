export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { zoneSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(zoneSchema, await req.json())
  if (data.locationId) {
    const loc = await prisma.location.findFirst({ where: { id: data.locationId, ...orgScope(user) }, select: { id: true } })
    if (!loc) throw new ApiError(400, 'Nieprawidłowy lokal')
  }
  const count = await prisma.zone.count({ where: orgScope(user) })
  const zone = await prisma.zone.create({ data: { organizationId: user.organizationId, name: data.name, locationId: data.locationId || null, sortOrder: count } })
  await audit(user, 'zone.create', 'Zone', zone.id, { name: zone.name })
  return NextResponse.json(zone, { status: 201 })
})
