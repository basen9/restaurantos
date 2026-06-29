import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role
  const where = role === 'EMPLOYEE' ? { assigneeId: userId } : {}
  const tasks = await prisma.task.findMany({
    where, include: { assignee: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const task = await prisma.task.create({
    data: { ...body, creatorId: (session.user as any).id },
    include: { assignee: { select: { id: true, name: true } } }
  })
  await prisma.notification.create({ data: { userId: body.assigneeId, title: 'Nowe zadanie', body: `Przydzielono Ci zadanie: ${body.title}`, type: 'TASK' } })
  return NextResponse.json(task, { status: 201 })
}
