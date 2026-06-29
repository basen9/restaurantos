export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { inventoryItemUpdateSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY)
  const data = parseBody(inventoryItemUpdateSchema, await req.json())

  const item = await prisma.inventoryItem.findFirst({ where: { id: params.id, ...orgScope(user) } })
  if (!item) throw new ApiError(404, 'Inventory item not found')

  const { restock, restockType, reason, supplierId, ...fields } = data

  // Ruch magazynowy (przyjęcie/korekta/zużycie/strata) — aktualizuje stan.
  let newStock = item.stock
  if (typeof restock === 'number' && restock !== 0) {
    newStock = Math.max(0, item.stock + restock)
    await prisma.stockMovement.create({
      data: {
        organizationId: user.organizationId,
        inventoryItemId: item.id,
        userId: user.id,
        type: restockType || (restock > 0 ? 'PURCHASE' : 'ADJUSTMENT'),
        quantity: restock,
        unitCost: restockType === 'PURCHASE' || (!restockType && restock > 0) ? (fields.costPerUnit ?? item.costPerUnit) : null,
        reason,
      },
    })
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: item.id },
    data: {
      ...fields,
      ...(supplierId !== undefined ? { supplierId: supplierId || null } : {}),
      stock: newStock,
    },
  })
  return NextResponse.json(updated)
})
