export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { reservationUpdateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORDERS)
  const data = parseBody(reservationUpdateSchema, await req.json())
  const existing = await prisma.reservation.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'Rezerwacja nie istnieje')
  if (data.tableId) {
    const t = await prisma.restaurantTable.findFirst({ where: { id: data.tableId, ...orgScope(user) }, select: { id: true } })
    if (!t) throw new ApiError(400, 'Nieprawidłowy stolik')
  }
  const updated = await prisma.reservation.update({ where: { id: params.id }, data })
  await audit(user, 'reservation.update', 'Reservation', updated.id, { status: updated.status })
  return NextResponse.json(updated)
})

export const DELETE = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORDERS)
  const existing = await prisma.reservation.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'Rezerwacja nie istnieje')
  await prisma.reservation.delete({ where: { id: params.id } })
  await audit(user, 'reservation.delete', 'Reservation', params.id)
  return NextResponse.json({ ok: true })
})
