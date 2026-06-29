import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const where: any = role === 'EMPLOYEE' ? { userId: (session.user as any).id } : {}
  if (date) { const d = new Date(date); where.date = { gte: new Date(d.setHours(0,0,0,0)), lte: new Date(d.setHours(23,59,59,999)) } }
  const items = await prisma.inventory.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { items } = body
  const userId = (session.user as any).id
  const created = await prisma.$transaction(items.map((item: any) =>
    prisma.inventory.create({ data: { ...item, userId } })
  ))
  return NextResponse.json(created, { status: 201 })
}
