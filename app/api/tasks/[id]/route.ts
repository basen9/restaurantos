import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { taskUpdateSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requireAuth()
  const data = parseBody(taskUpdateSchema, await req.json())

  const task = await prisma.task.findFirst({ where: { id: params.id, ...orgScope(user) } })
  if (!task) throw new ApiError(404, 'Task not found')

  const canManage = hasPermission(user, PERMISSIONS.MANAGE_TASKS)
  const isAssignee = task.assigneeId === user.id

  // Bez uprawnienia zarządczego: można edytować tylko własne zadanie i tylko jego status.
  if (!canManage) {
    if (!isAssignee) throw new ApiError(403, 'Forbidden')
    const keys = Object.keys(data)
    if (keys.some((k) => k !== 'status')) throw new ApiError(403, 'Możesz zmienić tylko status własnego zadania')
  }

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: { ...data, completedAt: data.status === 'DONE' ? new Date() : data.status ? null : undefined },
  })
  return NextResponse.json(updated)
})

export const DELETE = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_TASKS)
  const task = await prisma.task.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!task) throw new ApiError(404, 'Task not found')
  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
})
