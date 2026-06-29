export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { recipeSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

// Food cost teoretyczny: koszt składników / yield, marża vs cena sprzedaży.
function computeCost(recipe: any) {
  const total = (recipe.items || []).reduce((s: number, it: any) => s + it.quantity * (it.inventoryItem?.costPerUnit || 0), 0)
  const perUnit = recipe.yield > 0 ? total / recipe.yield : total
  const price = recipe.product?.price || 0
  const foodCostPct = price > 0 ? Math.round((perUnit / price) * 100) : null
  const marginPct = price > 0 ? Math.round(((price - perUnit) / price) * 100) : null
  return { costPerUnit: Math.round(perUnit * 100) / 100, price, foodCostPct, marginPct }
}

export const GET = handle(async () => {
  const user = await requireAuth()
  const recipes = await prisma.recipe.findMany({
    where: orgScope(user),
    include: { product: true, items: { include: { inventoryItem: { select: { id: true, name: true, unit: true, costPerUnit: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(recipes.map((r) => ({ ...r, ...computeCost(r) })))
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS)
  const data = parseBody(recipeSchema, await req.json())

  // Produkt i składniki muszą należeć do organizacji.
  const product = await prisma.product.findFirst({ where: { id: data.productId, ...orgScope(user) }, include: { recipe: true } })
  if (!product) throw new ApiError(404, 'Product not found')
  if (product.recipe) throw new ApiError(409, 'Receptura dla tego produktu już istnieje')

  const ingredientIds = data.items.map((i) => i.inventoryItemId)
  const validCount = await prisma.inventoryItem.count({ where: { id: { in: ingredientIds }, ...orgScope(user) } })
  if (validCount !== new Set(ingredientIds).size) throw new ApiError(400, 'Nieprawidłowy składnik')

  const recipe = await prisma.recipe.create({
    data: {
      organizationId: user.organizationId,
      productId: data.productId,
      yield: data.yield,
      notes: data.notes,
      items: { create: data.items.map((i) => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity, unit: i.unit })) },
    },
    include: { product: true, items: { include: { inventoryItem: { select: { id: true, name: true, unit: true, costPerUnit: true } } } } },
  })
  return NextResponse.json(recipe, { status: 201 })
})
