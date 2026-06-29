import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id
  const { searchParams } = new URL(req.url)
  const withId = searchParams.get('with')
  const where = withId
    ? { OR: [{ senderId: userId, recipientId: withId }, { senderId: withId, recipientId: userId }] }
    : { OR: [{ senderId: userId }, { recipientId: userId }] }
  const messages = await prisma.message.findMany({ where, include: { sender: { select: { id: true, name: true } }, recipient: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { recipientId, content } = await req.json()
  const msg = await prisma.message.create({
    data: { senderId: (session.user as any).id, recipientId, content },
    include: { sender: { select: { id: true, name: true } } }
  })
  return NextResponse.json(msg, { status: 201 })
}
