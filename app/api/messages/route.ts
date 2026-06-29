import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope, ApiError } from '@/lib/api'
import { messageSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async (req) => {
  const user = await requireAuth()
  const { searchParams } = new URL(req.url)
  const withId = searchParams.get('with')

  const scope = orgScope(user)
  const where = withId
    ? { ...scope, OR: [{ senderId: user.id, recipientId: withId }, { senderId: withId, recipientId: user.id }] }
    : { ...scope, OR: [{ senderId: user.id }, { recipientId: user.id }] }

  const messages = await prisma.message.findMany({
    where,
    include: { sender: { select: { id: true, name: true } }, recipient: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(messages)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { recipientId, content } = parseBody(messageSchema, await req.json())

  // Odbiorca musi należeć do tej samej organizacji.
  const recipient = await prisma.user.findFirst({ where: { id: recipientId, ...orgScope(user) }, select: { id: true } })
  if (!recipient) throw new ApiError(404, 'Recipient not found')

  const msg = await prisma.message.create({
    data: { organizationId: user.organizationId, senderId: user.id, recipientId, content },
    include: { sender: { select: { id: true, name: true } } },
  })
  return NextResponse.json(msg, { status: 201 })
})
