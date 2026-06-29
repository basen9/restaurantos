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

const round2 = (n: number) => Math.round(n * 100) / 100

// Czas zmiany w minutach: realny clock-in/out, dla ACTIVE do teraz, fallback do grafiku.
function shiftMinutes(s: { actualStart: Date | null; actualEnd: Date | null; status: string; startTime: string; endTime: string }): number {
  if (s.actualStart && s.actualEnd) return Math.max(0, (s.actualEnd.getTime() - s.actualStart.getTime()) / 60000)
  if (s.actualStart && s.status === 'ACTIVE') return Math.max(0, (Date.now() - s.actualStart.getTime()) / 60000)
  const [h1, m1] = (s.startTime || '0:0').split(':').map(Number)
  const [h2, m2] = (s.endTime || '0:0').split(':').map(Number)
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1))
}

// Koszt pracy w okresie = Σ godziny × stawka godzinowa.
export async function laborCost(organizationId: string, from: Date, to: Date): Promise<number> {
  const shifts = await prisma.shift.findMany({
    where: { organizationId, date: { gte: from, lte: to }, status: { in: ['COMPLETED', 'ACTIVE'] } },
    include: { user: { select: { hourlyRate: true } } },
  })
  let cost = 0
  for (const s of shifts) cost += (shiftMinutes(s) / 60) * (s.user?.hourlyRate || 0)
  return Math.round(cost)
}

// Wariancja food cost: rzeczywiste zużycie magazynu (ruchy) vs teoretyczne wynikające ze sprzedaży.
// Dodatnia wariancja = z magazynu zeszło więcej niż wynika ze sprzedaży (nadprodukcja/straty/błędy porcji).
export async function foodCostVariance(organizationId: string, from: Date) {
  const [recipes, sales, movements, items] = await Promise.all([
    prisma.recipe.findMany({ where: { organizationId }, select: { productId: true, yield: true, items: { select: { inventoryItemId: true, quantity: true } } } }),
    prisma.sale.findMany({ where: { organizationId, soldAt: { gte: from } }, select: { items: { select: { productId: true, quantity: true } } } }),
    prisma.stockMovement.groupBy({ by: ['inventoryItemId'], where: { organizationId, type: { in: ['USAGE', 'WASTE'] }, createdAt: { gte: from } }, _sum: { quantity: true } }),
    prisma.inventoryItem.findMany({ where: { organizationId }, select: { id: true, name: true, unit: true, costPerUnit: true } }),
  ])

  const recipeByProduct = new Map<string, { inventoryItemId: string; perUnit: number }[]>()
  for (const r of recipes) recipeByProduct.set(r.productId, r.items.map((it) => ({ inventoryItemId: it.inventoryItemId, perUnit: r.yield > 0 ? it.quantity / r.yield : it.quantity })))

  const theoretical = new Map<string, number>()
  for (const s of sales) for (const li of s.items) {
    if (!li.productId) continue
    const ings = recipeByProduct.get(li.productId)
    if (!ings) continue
    for (const ing of ings) theoretical.set(ing.inventoryItemId, (theoretical.get(ing.inventoryItemId) || 0) + ing.perUnit * li.quantity)
  }
  const actual = new Map<string, number>()
  for (const m of movements) actual.set(m.inventoryItemId, Math.abs(m._sum.quantity || 0))

  const itemMap = new Map(items.map((i) => [i.id, i]))
  const ids = new Set<string>(Array.from(theoretical.keys()).concat(Array.from(actual.keys())))
  const rows = Array.from(ids)
    .map((id) => {
      const it = itemMap.get(id)
      const th = theoretical.get(id) || 0
      const ac = actual.get(id) || 0
      const variance = ac - th
      return { inventoryItemId: id, name: it?.name || '—', unit: it?.unit || '', theoretical: round2(th), actual: round2(ac), variance: round2(variance), varianceCost: round2(variance * (it?.costPerUnit || 0)) }
    })
    .filter((r) => r.theoretical > 0 || r.actual > 0)
  rows.sort((a, b) => Math.abs(b.varianceCost) - Math.abs(a.varianceCost))
  return rows
}
