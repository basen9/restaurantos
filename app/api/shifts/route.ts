import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || (session.user as any).id
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const where: any = { userId }
  if (from && to) { where.date = { gte: new Date(from), lte: new Date(to) } }
  const shifts = await prisma.shift.findMany({ where, include: { location: true }, orderBy: { date: 'asc' } })
  return NextResponse.json(shifts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const shift = await prisma.shift.create({ data: body })
  return NextResponse.json(shift, { status: 201 })
}
