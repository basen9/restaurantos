// Wspólna logika finansowa: koszt wytworzenia (COGS) na podstawie receptur i produktów.
import { prisma } from './prisma'

// Mapa productId -> teoretyczny koszt jednostkowy (z receptury, fallback do Product.costPerUnit).
export async function productCostMap(organizationId: string): Promise<Map<string, number>> {
  const [recipes, products] = await Promise.all([
    prisma.recipe.findMany({
      where: { organizationId },
      include: { items: { include: { inventoryItem: { select: { costPerUnit: true } } } } },
    }),
    prisma.product.findMany({ where: { organizationId }, select: { id: true, costPerUnit: true } }),
  ])
  const map = new Map<string, number>()
  for (const p of products) map.set(p.id, p.costPerUnit || 0)
  for (const r of recipes) {
    const total = r.items.reduce((s, it) => s + it.quantity * (it.inventoryItem?.costPerUnit || 0), 0)
    const per = r.yield > 0 ? total / r.yield : total
    map.set(r.productId, Math.round(per * 100) / 100)
  }
  return map
}

// COGS dla zbioru pozycji sprzedaży.
export function cogsFor(items: { productId: string | null; quantity: number }[], costMap: Map<string, number>): number {
  return items.reduce((s, it) => s + (it.productId ? (costMap.get(it.productId) || 0) : 0) * it.quantity, 0)
}
