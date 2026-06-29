export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { taskCreateSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const canSeeAll = hasPermission(user, PERMISSIONS.MANAGE_TASKS)
  const tasks = await prisma.task.findMany({
    where: { ...orgScope(user), ...(canSeeAll ? {} : { assigneeId: user.id }) },
    include: {
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(tasks)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_TASKS)
  const data = parseBody(taskCreateSchema, await req.json())

  // Przypisany pracownik musi należeć do tej samej organizacji.
  const assignee = await prisma.user.findFirst({ where: { id: data.assigneeId, ...orgScope(user) }, select: { id: true } })
  if (!assignee) throw new ApiError(404, 'Assignee not found')

  const task = await prisma.task.create({
    data: { ...data, organizationId: user.organizationId, creatorId: user.id },
    include: { assignee: { select: { id: true, name: true } } },
  })
  await prisma.notification.create({
    data: {
      organizationId: user.organizationId,
      userId: data.assigneeId,
      title: 'Nowe zadanie',
      body: `Przydzielono Ci zadanie: ${data.title}`,
      type: 'TASK',
    },
  })
  return NextResponse.json(task, { status: 201 })
})