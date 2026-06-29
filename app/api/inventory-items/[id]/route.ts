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

  // Walidacja właściciela dostawcy (izolacja tenanta — supplierId pochodzi z body).
  if (supplierId) {
    const sup = await prisma.supplier.findFirst({ where: { id: supplierId, ...orgScope(user) }, select: { id: true } })
    if (!sup) throw new ApiError(400, 'Nieprawidłowy dostawca')
  }

  const hasMovement = typeof restock === 'number' && restock !== 0

  // Atomowo: ruch magazynowy + zmiana stanu (increment) w jednej transakcji.
  // Brak read-modify-write → brak utraty aktualizacji przy współbieżności; spójność ruchy↔stan.
  const updated = await prisma.$transaction(async (tx) => {
    if (hasMovement) {
      await tx.stockMovement.create({
        data: {
          organizationId: user.organizationId,
          inventoryItemId: item.id,
          userId: user.id,
          type: restockType || (restock! > 0 ? 'PURCHASE' : 'ADJUSTMENT'),
          quantity: restock!,
          unitCost: restockType === 'PURCHASE' || (!restockType && restock! > 0) ? (fields.costPerUnit ?? item.costPerUnit) : null,
          reason,
        },
      })
    }
    return tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        ...fields,
        ...(supplierId !== undefined ? { supplierId: supplierId || null } : {}),
        ...(hasMovement ? { stock: { increment: restock! } } : {}),
      },
    })
  })
  return NextResponse.json(updated)
})
