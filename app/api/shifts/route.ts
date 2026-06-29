export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { shiftSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async (req) => {
  const user = await requireAuth()
  const canSeeAll = hasPermission(user, PERMISSIONS.VIEW_ALL_SHIFTS)
  const { searchParams } = new URL(req.url)
  const requestedUserId = searchParams.get('userId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Bez uprawnienia VIEW_ALL_SHIFTS użytkownik widzi wyłącznie własne zmiany (koniec IDOR).
  const targetUserId = canSeeAll && requestedUserId ? requestedUserId : user.id

  const where: any = { ...orgScope(user), userId: targetUserId }
  if (from && to) where.date = { gte: new Date(from), lte: new Date(to) }

  const shifts = await prisma.shift.findMany({ where, include: { location: true }, orderBy: { date: 'asc' } })
  return NextResponse.json(shifts)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_SCHEDULE)
  const data = parseBody(shiftSchema, await req.json())

  // Pracownik i lokal muszą należeć do tej samej organizacji.
  const [assignee, location] = await Promise.all([
    prisma.user.findFirst({ where: { id: data.userId, ...orgScope(user) }, select: { id: true } }),
    prisma.location.findFirst({ where: { id: data.locationId, ...orgScope(user) }, select: { id: true } }),
  ])
  if (!assignee) throw new ApiError(404, 'User not found')
  if (!location) throw new ApiError(404, 'Location not found')

  const shift = await prisma.shift.create({
    data: {
      organizationId: user.organizationId,
      userId: data.userId,
      locationId: data.locationId,
      scheduleId: data.scheduleId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes,
    },
  })
  return NextResponse.json(shift, { status: 201 })
})