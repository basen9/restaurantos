export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { guestUpdateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

// Szczegóły gościa + ostatnie wizyty (historia).
export const GET = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const guest = await prisma.guest.findFirst({
    where: { id: params.id, ...orgScope(user) },
    include: { sales: { orderBy: { soldAt: 'desc' }, take: 20, select: { id: true, total: true, soldAt: true, paymentMethod: true } } },
  })
  if (!guest) throw new ApiError(404, 'Gość nie istnieje')
  return NextResponse.json(guest)
})

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORDERS)
  const data = parseBody(guestUpdateSchema, await req.json())
  const existing = await prisma.guest.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'Gość nie istnieje')
  const { birthday, ...rest } = data
  const birthdayVal = birthday === undefined ? undefined : (birthday ? new Date(birthday as any) : null)
  let updated
  try {
    updated = await prisma.guest.update({ where: { id: params.id }, data: { ...rest, email: data.email ? data.email.toLowerCase() : (data.email === '' ? null : undefined), ...(birthdayVal !== undefined ? { birthday: birthdayVal } : {}) } })
  } catch (e: any) {
    if (e?.code === 'P2002') throw new ApiError(409, 'Gość z tym adresem e-mail już istnieje')
    throw e
  }
  await audit(user, 'guest.update', 'Guest', updated.id)
  return NextResponse.json(updated)
})

export const DELETE = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORDERS)
  const existing = await prisma.guest.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'Gość nie istnieje')
  await prisma.guest.delete({ where: { id: params.id } })
  await audit(user, 'guest.delete', 'Guest', params.id)
  return NextResponse.json({ ok: true })
})
