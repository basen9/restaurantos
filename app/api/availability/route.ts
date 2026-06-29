export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope } from '@/lib/api'
import { availabilitySchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const days = await prisma.availability.findMany({ where: { ...orgScope(user), userId: user.id }, orderBy: { dayOfWeek: 'asc' } })
  return NextResponse.json(days)
})

// Pracownik ustawia własną dostępność tygodniową (upsert per dzień).
export const PUT = handle(async (req) => {
  const user = await requireAuth()
  const { days } = parseBody(availabilitySchema, await req.json())

  await prisma.$transaction(
    days.map((d) =>
      prisma.availability.upsert({
        where: { userId_dayOfWeek: { userId: user.id, dayOfWeek: d.dayOfWeek } },
        update: { available: d.available, fromTime: d.fromTime, toTime: d.toTime, notes: d.notes },
        create: { organizationId: user.organizationId, userId: user.id, dayOfWeek: d.dayOfWeek, available: d.available, fromTime: d.fromTime, toTime: d.toTime, notes: d.notes },
      }),
    ),
  )
  const updated = await prisma.availability.findMany({ where: { ...orgScope(user), userId: user.id }, orderBy: { dayOfWeek: 'asc' } })
  return NextResponse.json(updated)
})
