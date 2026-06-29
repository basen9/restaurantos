export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { saleSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.VIEW_FINANCE)
  const sales = await prisma.sale.findMany({
    where: orgScope(user),
    include: { items: true },
    orderBy: { soldAt: 'desc' },
    take: 30,
  })
  return NextResponse.json(sales)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const data = parseBody(saleSchema, await req.json())

  const items = data.items.map((i) => ({ ...i, total: Math.round(i.quantity * i.unitPrice * 100) / 100 }))
  const total = items.reduce((s, i) => s + i.total, 0)

  const sale = await prisma.sale.create({
    data: {
      organizationId: user.organizationId,
      locationId: user.locationId,
      soldAt: data.soldAt || new Date(),
      total,
      source: 'MANUAL',
      items: { create: items.map((i) => ({ productId: i.productId || null, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })) },
    },
    include: { items: true },
  })
  return NextResponse.json(sale, { status: 201 })
})
