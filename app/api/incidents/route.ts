export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { recipientsWithPermission } from '@/lib/notify'
import { incidentSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const canSeeAll = hasPermission(user, PERMISSIONS.MANAGE_INCIDENTS)
  const incidents = await prisma.incident.findMany({
    where: { ...orgScope(user), ...(canSeeAll ? {} : { userId: user.id }) },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(incidents)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const data = parseBody(incidentSchema, await req.json())

  const incident = await prisma.incident.create({
    data: { ...data, organizationId: user.organizationId, userId: user.id },
  })

  const recipients = await recipientsWithPermission(user.organizationId, PERMISSIONS.MANAGE_INCIDENTS)
  if (recipients.length) {
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        organizationId: user.organizationId,
        userId: r.id,
        title: `⚠️ Nowa awaria: ${data.device}`,
        body: `${user.name} zgłosił(a) awarię: ${data.description.slice(0, 80)}`,
        type: 'WARNING' as const,
      })),
    })
  }
  return NextResponse.json(incident, { status: 201 })
})