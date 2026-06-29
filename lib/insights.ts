// Snapshot biznesu dla AI COO — kompaktowy obraz operacyjny tenanta.
import { prisma } from './prisma'
import type { AuthUser } from './api'

export interface BusinessSnapshot {
  date: string
  waste: { month: number; topProducts: { product: string; cost: number }[] }
  foodCost: { avgPct: number | null; worst: { name: string; pct: number }[] }
  inventory: { lowStock: { name: string; stock: number; minStock: number; unit: string; estOrderCost: number }[]; orderTotal: number }
  attention: { openIncidents: number; pendingVacations: number; openTasks: number }
  team: { employees: number; activeNow: number }
}

export async function getBusinessSnapshot(user: Pick<AuthUser, 'organizationId'>): Promise<BusinessSnapshot> {
  const org = { organizationId: user.organizationId }
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [wasteMonth, topWaste, recipes, stockItems, openIncidents, pendingVacations, openTasks, employees, activeNow] =
    await Promise.all([
      prisma.wasteReport.aggregate({ where: { ...org, date: { gte: monthStart } }, _sum: { totalCost: true } }),
      prisma.wasteReport.groupBy({ by: ['product'], where: { ...org, date: { gte: monthStart } }, _sum: { totalCost: true }, orderBy: { _sum: { totalCost: 'desc' } }, take: 3 }),
      prisma.recipe.findMany({ where: org, include: { product: { select: { name: true, price: true } }, items: { include: { inventoryItem: { select: { costPerUnit: true } } } } } }),
      prisma.inventoryItem.findMany({ where: { ...org, isActive: true } }),
      prisma.incident.count({ where: { ...org, status: 'OPEN' } }),
      prisma.vacation.count({ where: { ...org, status: 'PENDING' } }),
      prisma.task.count({ where: { ...org, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
      prisma.user.count({ where: { ...org, role: 'EMPLOYEE', isActive: true } }),
      prisma.shift.count({ where: { ...org, status: 'ACTIVE' } }),
    ])

  const fc = recipes
    .map((r) => {
      const total = r.items.reduce((s, it) => s + it.quantity * (it.inventoryItem?.costPerUnit || 0), 0)
      const per = r.yield > 0 ? total / r.yield : total
      const price = r.product?.price || 0
      return { name: r.product?.name || '—', pct: price > 0 ? Math.round((per / price) * 100) : null }
    })
    .filter((x): x is { name: string; pct: number } => x.pct != null)
  const avgFoodCost = fc.length ? Math.round(fc.reduce((s, x) => s + x.pct, 0) / fc.length) : null
  const worst = fc.sort((a, b) => b.pct - a.pct).slice(0, 3)

  const lowStock = stockItems
    .filter((i) => i.minStock > 0 && i.stock <= i.minStock)
    .map((i) => {
      const qty = Math.max(1, Math.ceil(i.minStock * 2 - i.stock))
      return { name: i.name, stock: i.stock, minStock: i.minStock, unit: i.unit, estOrderCost: Math.round(qty * (i.costPerUnit || 0)) }
    })
  const orderTotal = lowStock.reduce((s, i) => s + i.estOrderCost, 0)

  return {
    date: now.toISOString().slice(0, 10),
    waste: { month: Math.round(wasteMonth._sum.totalCost || 0), topProducts: topWaste.map((w) => ({ product: w.product, cost: Math.round(w._sum.totalCost || 0) })) },
    foodCost: { avgPct: avgFoodCost, worst },
    inventory: { lowStock, orderTotal },
    attention: { openIncidents, pendingVacations, openTasks },
    team: { employees, activeNow },
  }
}
