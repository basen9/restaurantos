import { NextResponse } from 'next/server'
import { handle, requireAuth, orgScope } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const notifs = await prisma.notification.findMany({
    where: { ...orgScope(user), userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(notifs)
})

export const PATCH = handle(async () => {
  const user = await requireAuth()
  await prisma.notification.updateMany({
    where: { ...orgScope(user), userId: user.id, read: false },
    data: { read: true, readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
})
