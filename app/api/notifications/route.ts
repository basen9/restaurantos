import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const notifs = await prisma.notification.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  return NextResponse.json(notifs)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.notification.updateMany({
    where: { userId: (session.user as any).id, read: false },
    data: { read: true, readAt: new Date() }
  })
  return NextResponse.json({ ok: true })
}
