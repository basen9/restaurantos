export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { inventoryItemSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const items = await prisma.inventoryItem.findMany({
    where: { ...orgScope(user), isActive: true },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  // flaga niskiego stanu (pomocniczo dla UI)
  const withFlags = items.map((i) => ({ ...i, low: i.minStock > 0 && i.stock <= i.minStock }))
  return NextResponse.json(withFlags)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY)
  const data = parseBody(inventoryItemSchema, await req.json())

  const item = await prisma.inventoryItem.create({
    data: {
      organizationId: user.organizationId,
      name: data.name,
      category: data.category,
      unit: data.unit,
      stock: data.stock,
      minStock: data.minStock,
      costPerUnit: data.costPerUnit,
      supplierId: data.supplierId || null,
    },
  })
  // Stan początkowy jako ruch magazynowy (audyt ruchów).
  if (data.stock > 0) {
    await prisma.stockMovement.create({
      data: { organizationId: user.organizationId, inventoryItemId: item.id, userId: user.id, type: 'PURCHASE', quantity: data.stock, unitCost: data.costPerUnit, reason: 'Stan początkowy' },
    })
  }
  return NextResponse.json(item, { status: 201 })
})
