import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const role = (session.user as any).role
  const where = role === 'EMPLOYEE' ? { userId } : {}
  const incidents = await prisma.incident.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(incidents)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const incident = await prisma.incident.create({ data: { ...body, userId: (session.user as any).id } })
  const managers = await prisma.user.findMany({ where: { role: { in: ['MANAGER', 'OWNER'] } } })
  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } })
  await prisma.notification.createMany({ data: managers.map(m => ({ userId: m.id, title: `⚠️ Nowa awaria: ${body.device}`, body: `${user?.name} zgłosił(a) awarię: ${body.description.slice(0,80)}`, type: 'WARNING' })) })
  return NextResponse.json(incident, { status: 201 })
}
