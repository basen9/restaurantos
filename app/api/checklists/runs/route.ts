import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { templateId, completions } = await req.json()
  const userId = (session.user as any).id
  const run = await prisma.checklistRun.create({
    data: {
      templateId, userId, status: 'SUBMITTED', completedAt: new Date(),
      completions: { create: completions.map((c: any) => ({ itemId: c.itemId, done: c.done, doneAt: c.done ? new Date() : null })) }
    },
    include: { completions: true }
  })
  return NextResponse.json(run, { status: 201 })
}
