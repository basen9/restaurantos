export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { tableUpdateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(tableUpdateSchema, await req.json())
  const table = await prisma.restaurantTable.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!table) throw new ApiError(404, 'Stolik nie istnieje')
  if (data.zoneId) {
    const zone = await prisma.zone.findFirst({ where: { id: data.zoneId, ...orgScope(user) }, select: { id: true } })
    if (!zone) throw new ApiError(400, 'Nieprawidłowa strefa')
  }
  const updated = await prisma.restaurantTable.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
})

export const DELETE = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const table = await prisma.restaurantTable.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!table) throw new ApiError(404, 'Stolik nie istnieje')
  await prisma.restaurantTable.delete({ where: { id: params.id } })
  await audit(user, 'table.delete', 'RestaurantTable', params.id)
  return NextResponse.json({ ok: true })
})
