import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const userId = (session.user as any).id
  const role = (session.user as any).role
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const where: any = role === 'EMPLOYEE' ? { userId } : {}
  if (from) where.date = { gte: new Date(from) }
  if (to) where.date = { ...where.date, lte: new Date(to) }
  const reports = await prisma.wasteReport.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const report = await prisma.wasteReport.create({ data: { ...body, userId: (session.user as any).id } })
  return NextResponse.json(report, { status: 201 })
}
