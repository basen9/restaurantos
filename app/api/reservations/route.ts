export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { reservationSchema } from '@/lib/validation'
import { loadSettings } from '@/lib/settingsService'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

// Lista rezerwacji na dany dzień (?date=YYYY-MM-DD; domyślnie dziś).
export const GET = handle(async (req) => {
  const user = await requireAuth()
  const dateStr = new URL(req.url).searchParams.get('date')
  const day = dateStr ? new Date(dateStr) : new Date()
  const from = new Date(day); from.setHours(0, 0, 0, 0)
  const to = new Date(day); to.setHours(23, 59, 59, 999)
  const reservations = await prisma.reservation.findMany({
    where: { ...orgScope(user), startsAt: { gte: from, lte: to } },
    include: { table: { select: { name: true } } },
    orderBy: { startsAt: 'asc' },
  })
  return NextResponse.json(reservations)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORDERS)
  const settings = await loadSettings(user.organizationId)
  if (!settings.reservationsEnabled) throw new ApiError(403, 'Rezerwacje są wyłączone w ustawieniach')
  const data = parseBody(reservationSchema, await req.json())
  if (data.tableId) {
    const t = await prisma.restaurantTable.findFirst({ where: { id: data.tableId, ...orgScope(user) }, select: { id: true } })
    if (!t) throw new ApiError(400, 'Nieprawidłowy stolik')
  }
  if (data.locationId) {
    const l = await prisma.location.findFirst({ where: { id: data.locationId, ...orgScope(user) }, select: { id: true } })
    if (!l) throw new ApiError(400, 'Nieprawidłowy lokal')
  }
  const r = await prisma.reservation.create({ data: { organizationId: user.organizationId, ...data, createdById: user.id } })
  await audit(user, 'reservation.create', 'Reservation', r.id, { guestName: r.guestName, startsAt: r.startsAt })
  return NextResponse.json(r, { status: 201 })
})
