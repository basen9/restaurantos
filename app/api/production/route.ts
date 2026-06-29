import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope } from '@/lib/api'
import { productionBatchSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async (req) => {
  const user = await requireAuth()
  const { searchParams } = new URL(req.url)
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7', 10) || 7, 1), 365)
  const from = new Date(); from.setDate(from.getDate() - days)

  const items = await prisma.production.findMany({
    where: { ...orgScope(user), date: { gte: from } },
    include: { user: { select: { name: true } } },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(items)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { items } = parseBody(productionBatchSchema, await req.json())

  const created = await prisma.$transaction(
    items.map((item) =>
      prisma.production.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          product: item.product,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
        },
      }),
    ),
  )
  return NextResponse.json(created, { status: 201 })
})
