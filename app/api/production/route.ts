export const dynamic = 'force-dynamic'
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

  // Mapa produktów (po nazwie) z recepturami — by zużyć składniki z magazynu.
  const recipes = await prisma.recipe.findMany({
    where: orgScope(user),
    include: { product: { select: { name: true } }, items: true },
  })
  const recipeByProduct = new Map(recipes.map((r) => [r.product.name.toLowerCase(), r]))

  const result = await prisma.$transaction(async (tx) => {
    const created = []
    for (const item of items) {
      created.push(
        await tx.production.create({
          data: { organizationId: user.organizationId, userId: user.id, product: item.product, quantity: item.quantity, unit: item.unit, notes: item.notes },
        }),
      )

      // Zużycie składników wg receptury (zamyka pętlę magazyn ↔ produkcja).
      const recipe = recipeByProduct.get(item.product.toLowerCase())
      if (recipe && recipe.yield > 0) {
        const batches = item.quantity / recipe.yield
        for (const ri of recipe.items) {
          const consumed = ri.quantity * batches
          if (consumed <= 0) continue
          await tx.inventoryItem.update({ where: { id: ri.inventoryItemId }, data: { stock: { decrement: consumed } } })
          await tx.stockMovement.create({
            data: {
              organizationId: user.organizationId,
              inventoryItemId: ri.inventoryItemId,
              userId: user.id,
              type: 'USAGE',
              quantity: -consumed,
              reason: `Produkcja: ${item.product} (${item.quantity} ${item.unit})`,
            },
          })
        }
      }
    }
    return created
  })

  return NextResponse.json(result, { status: 201 })
})