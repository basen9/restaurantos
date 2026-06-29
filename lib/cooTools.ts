// Narzędzia AI COO (tool-use) — model sięga po konkretne dane na żądanie,
// zamiast otrzymywać cały snapshot. Każde narzędzie jest org-scoped (izolacja tenanta).
import { prisma } from './prisma'
import { productCostMap, cogsFor, laborCost, foodCostVariance } from './finance'
import { summarizeOrder } from './floor'
import type { AuthUser } from './api'

type Ctx = Pick<AuthUser, 'organizationId'>

function range(period: string) {
  const now = new Date()
  const from = new Date(now)
  if (period === 'today') from.setHours(0, 0, 0, 0)
  else if (period === 'week') from.setDate(now.getDate() - 7)
  else from.setFullYear(now.getFullYear(), now.getMonth(), 1), from.setHours(0, 0, 0, 0) // month
  return { from, to: now }
}

export interface CooTool {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, any>; required?: string[] }
  execute: (ctx: Ctx, input: any) => Promise<any>
}

export const COO_TOOLS: CooTool[] = [
  {
    name: 'get_sales',
    description: 'Sprzedaż w okresie (today|week|month): przychód, liczba transakcji, średni paragon, COGS, marża surowca, food cost rzeczywisty.',
    input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'week', 'month'] } }, required: ['period'] },
    execute: async (ctx, { period }) => {
      const { from } = range(period)
      const [sales, costMap, conn] = await Promise.all([
        prisma.sale.findMany({ where: { organizationId: ctx.organizationId, soldAt: { gte: from } }, include: { items: { select: { productId: true, quantity: true } } } }),
        productCostMap(ctx.organizationId),
        prisma.posConnection.findUnique({ where: { organizationId: ctx.organizationId } }),
      ])
      const revenue = Math.round(sales.reduce((s, x) => s + x.total, 0))
      const cogs = Math.round(cogsFor(sales.flatMap((s) => s.items), costMap))
      return {
        posConnected: !!conn?.connected,
        period,
        revenue,
        transactions: sales.length,
        avgTicket: sales.length ? Math.round(revenue / sales.length) : 0,
        cogs,
        marginPct: revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 100) : null,
        foodCostPct: revenue > 0 ? Math.round((cogs / revenue) * 100) : null,
      }
    },
  },
  {
    name: 'get_labor_cost',
    description: 'Koszt pracy w okresie (today|week|month) i jego udział w sprzedaży.',
    input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'week', 'month'] } }, required: ['period'] },
    execute: async (ctx, { period }) => {
      const { from, to } = range(period)
      const [cost, sales] = await Promise.all([
        laborCost(ctx.organizationId, from, to),
        prisma.sale.aggregate({ where: { organizationId: ctx.organizationId, soldAt: { gte: from } }, _sum: { total: true } }),
      ])
      const revenue = Math.round(sales._sum.total || 0)
      return { period, laborCost: cost, revenue, laborCostPct: revenue > 0 ? Math.round((cost / revenue) * 100) : null }
    },
  },
  {
    name: 'get_inventory_status',
    description: 'Stany magazynowe poniżej minimum i sugerowane zamówienia (ilość, dostawca, szac. koszt).',
    input_schema: { type: 'object', properties: {} },
    execute: async (ctx) => {
      const items = await prisma.inventoryItem.findMany({ where: { organizationId: ctx.organizationId, isActive: true }, include: { supplier: { select: { name: true } } } })
      const low = items.filter((i) => i.minStock > 0 && i.stock <= i.minStock).map((i) => {
        const qty = Math.max(1, Math.ceil(i.minStock * 2 - i.stock))
        return { name: i.name, stock: i.stock, minStock: i.minStock, unit: i.unit, suggestedOrder: qty, supplier: i.supplier?.name || null, estCost: Math.round(qty * (i.costPerUnit || 0)) }
      })
      return { totalItems: items.length, lowStock: low, orderTotalCost: low.reduce((s, i) => s + i.estCost, 0) }
    },
  },
  {
    name: 'get_food_cost_variance',
    description: 'Wariancja food cost (miesiąc): rzeczywiste zużycie magazynu vs wynikające ze sprzedaży. Dodatnia = nadprodukcja/straty/błędy porcji.',
    input_schema: { type: 'object', properties: {} },
    execute: async (ctx) => {
      const { from } = range('month')
      const rows = await foodCostVariance(ctx.organizationId, from)
      return { variance: rows.filter((r) => Math.abs(r.varianceCost) >= 1).slice(0, 10) }
    },
  },
  {
    name: 'get_waste',
    description: 'Straty w okresie (today|week|month): suma kosztu i top produkty.',
    input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'week', 'month'] } }, required: ['period'] },
    execute: async (ctx, { period }) => {
      const { from } = range(period)
      const [sum, top] = await Promise.all([
        prisma.wasteReport.aggregate({ where: { organizationId: ctx.organizationId, date: { gte: from } }, _sum: { totalCost: true } }),
        prisma.wasteReport.groupBy({ by: ['product'], where: { organizationId: ctx.organizationId, date: { gte: from } }, _sum: { totalCost: true }, orderBy: { _sum: { totalCost: 'desc' } }, take: 5 }),
      ])
      return { period, totalCost: Math.round(sum._sum.totalCost || 0), topProducts: top.map((t) => ({ product: t.product, cost: Math.round(t._sum.totalCost || 0) })) }
    },
  },
  {
    name: 'get_attention_items',
    description: 'Sprawy wymagające uwagi: otwarte awarie, wnioski urlopowe, otwarte zadania, obecna obsada.',
    input_schema: { type: 'object', properties: {} },
    execute: async (ctx) => {
      const org = { organizationId: ctx.organizationId }
      const [openIncidents, pendingVacations, openTasks, activeShifts, employees] = await Promise.all([
        prisma.incident.count({ where: { ...org, status: 'OPEN' } }),
        prisma.vacation.count({ where: { ...org, status: 'PENDING' } }),
        prisma.task.count({ where: { ...org, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
        prisma.shift.count({ where: { ...org, status: 'ACTIVE' } }),
        prisma.user.count({ where: { ...org, role: 'EMPLOYEE', isActive: true } }),
      ])
      return { openIncidents, pendingVacations, openTasks, activeShifts, employees }
    },
  },
  {
    name: 'get_floor_status',
    description: 'Stan sali na żywo: zajęte stoliki, otwarta wartość rachunków, pozycje oczekujące/w przygotowaniu/gotowe oraz stoliki czekające najdłużej na wydanie (sygnał wolnej obsługi).',
    input_schema: { type: 'object', properties: {} },
    execute: async (ctx) => {
      const openOrders = await prisma.tableOrder.findMany({
        where: { organizationId: ctx.organizationId, status: 'OPEN' },
        include: { items: true, table: { select: { name: true } } },
      })
      const now = Date.now()
      const tables = openOrders.map((o) => ({ table: o.table?.name, ...summarizeOrder(o.items, now) }))
      const openValue = Math.round(tables.reduce((s, t) => s + t.total, 0) * 100) / 100
      const slow = tables.filter((t) => (t.oldestUnservedMin || 0) >= 20).map((t) => ({ table: t.table, waitingMin: t.oldestUnservedMin }))
      return {
        occupiedTables: openOrders.length,
        openBillsValue: openValue,
        pendingItems: tables.reduce((s, t) => s + t.pending, 0),
        preparingItems: tables.reduce((s, t) => s + t.preparing, 0),
        readyItems: tables.reduce((s, t) => s + t.ready, 0),
        slowTables: slow,
      }
    },
  },
]

export const COO_TOOL_MAP = new Map(COO_TOOLS.map((t) => [t.name, t]))

// Format narzędzi dla API Anthropic.
export function anthropicTools() {
  return COO_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }))
}
