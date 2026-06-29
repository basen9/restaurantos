import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { inventoryBatchSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async (req) => {
  const user = await requireAuth()
  const canSeeAll = hasPermission(user, PERMISSIONS.MANAGE_INVENTORY)
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  const where: any = { ...orgScope(user), ...(canSeeAll ? {} : { userId: user.id }) }
  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0)
    const end = new Date(date); end.setHours(23, 59, 59, 999)
    where.date = { gte: start, lte: end }
  }

  const items = await prisma.inventory.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const { items } = parseBody(inventoryBatchSchema, await req.json())

  const created = await prisma.$transaction(
    items.map((item) =>
      prisma.inventory.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          product: item.product,
          unit: item.unit,
          expected: item.expected,
          actual: item.actual,
          difference: item.actual - item.expected,
          notes: item.notes,
        },
      }),
    ),
  )
  return NextResponse.json(created, { status: 201 })
})
