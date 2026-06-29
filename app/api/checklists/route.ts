export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, orgScope } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const templates = await prisma.checklistTemplate.findMany({
    where: { ...orgScope(user), isActive: true },
    include: { items: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(templates)
})