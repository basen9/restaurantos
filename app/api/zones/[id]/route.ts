export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { zoneUpdateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(zoneUpdateSchema, await req.json())
  const zone = await prisma.zone.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!zone) throw new ApiError(404, 'Strefa nie istnieje')
  const updated = await prisma.zone.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
})

export const DELETE = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const zone = await prisma.zone.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!zone) throw new ApiError(404, 'Strefa nie istnieje')
  await prisma.zone.delete({ where: { id: params.id } }) // kaskada usuwa stoliki i ich zamówienia
  await audit(user, 'zone.delete', 'Zone', params.id)
  return NextResponse.json({ ok: true })
})
