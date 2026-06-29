export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { tableSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(tableSchema, await req.json())
  const zone = await prisma.zone.findFirst({ where: { id: data.zoneId, ...orgScope(user) }, select: { id: true } })
  if (!zone) throw new ApiError(400, 'Nieprawidłowa strefa')
  const count = await prisma.restaurantTable.count({ where: { zoneId: data.zoneId } })
  const table = await prisma.restaurantTable.create({
    data: { organizationId: user.organizationId, zoneId: data.zoneId, name: data.name, seats: data.seats, sortOrder: count },
  })
  await audit(user, 'table.create', 'RestaurantTable', table.id, { name: table.name })
  return NextResponse.json(table, { status: 201 })
})
