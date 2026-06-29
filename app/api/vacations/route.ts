import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope, ApiError } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { recipientsWithPermission } from '@/lib/notify'
import { vacationCreateSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

const MS_PER_DAY = 1000 * 60 * 60 * 24

export const GET = handle(async () => {
  const user = await requireAuth()
  const canSeeAll = hasPermission(user, PERMISSIONS.APPROVE_VACATIONS)
  const vacs = await prisma.vacation.findMany({
    where: { ...orgScope(user), ...(canSeeAll ? {} : { userId: user.id }) },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(vacs)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const data = parseBody(vacationCreateSchema, await req.json())

  if (data.endDate < data.startDate) throw new ApiError(400, 'Data zakończenia przed datą rozpoczęcia')
  // Liczba dni liczona po stronie serwera (włącznie z oboma krańcami).
  const days = Math.floor((data.endDate.getTime() - data.startDate.getTime()) / MS_PER_DAY) + 1

  const vac = await prisma.vacation.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      days,
      reason: data.reason,
      status: 'PENDING',
    },
  })

  const recipients = await recipientsWithPermission(user.organizationId, PERMISSIONS.APPROVE_VACATIONS)
  if (recipients.length) {
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        organizationId: user.organizationId,
        userId: r.id,
        title: 'Nowy wniosek urlopowy',
        body: `${user.name} złożył(a) wniosek urlopowy na ${days} dni.`,
        type: 'INFO' as const,
      })),
    })
  }
  return NextResponse.json(vac, { status: 201 })
})
