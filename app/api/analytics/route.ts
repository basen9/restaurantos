export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { productCostMap, cogsFor } from '@/lib/finance'
import { prisma } from '@/lib/prisma'

// Payload "centrum dowodzenia" — odpowiada na 5 pytań właściciela w 30 s:
// 1) ile dziś zarobiłem  2) gdzie tracę  3) który lokal rentowny
// 4) co zamówić  5) co wymaga uwagi
export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const org = orgScope(user)

  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)
  const startYesterday = new Date(startToday); startYesterday.setDate(startYesterday.getDate() - 1)
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    locations, users,
    wasteMonthRows, wasteWeek, wasteToday, wasteYesterday, topWaste,
    incidentRows, pendingVacations, openTasks,
    totalEmployees, activeShifts, scheduledShifts,
  ] = await Promise.all([
    prisma.location.findMany({ where: { ...org, isActive: true }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: org, select: { id: true, locationId: true } }),
    prisma.wasteReport.findMany({ where: { ...org, date: { gte: monthStart } }, select: { totalCost: true, userId: true } }),
    prisma.wasteReport.aggregate({ where: { ...org, date: { gte: weekAgo } }, _sum: { totalCost: true } }),
    prisma.wasteReport.aggregate({ where: { ...org, date: { gte: startToday } }, _sum: { totalCost: true } }),
    prisma.wasteReport.aggregate({ where: { ...org, date: { gte: startYesterday, lt: startToday } }, _sum: { totalCost: true } }),
    prisma.wasteReport.groupBy({ by: ['product'], where: { ...org, date: { gte: monthStart } }, _sum: { totalCost: true }, orderBy: { _sum: { totalCost: 'desc' } }, take: 5 }),
    prisma.incident.findMany({ where: { ...org, status: 'OPEN' }, select: { userId: true } }),
    prisma.vacation.count({ where: { ...org, status: 'PENDING' } }),
    prisma.task.count({ where: { ...org, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
    prisma.user.count({ where: { ...org, role: 'EMPLOYEE', isActive: true } }),
    prisma.shift.findMany({ where: { ...org, status: 'ACTIVE' }, select: { locationId: true } }),
    prisma.shift.findMany({ where: { ...org, status: 'SCHEDULED', date: { gte: startToday, lte: endToday } }, select: { locationId: true } }),
  ])

  const userLoc = new Map(users.map((u) => [u.id, u.locationId]))
  const wasteTodayCost = wasteToday._sum.totalCost || 0
  const wasteYesterdayCost = wasteYesterday._sum.totalCost || 0
  const wasteWeekCost = wasteWeek._sum.totalCost || 0
  const wasteMonthCost = wasteMonthRows.reduce((s, r) => s + (r.totalCost || 0), 0)
  const topProducts = topWaste.map((w) => ({ product: w.product, cost: w._sum.totalCost || 0 }))
  const openIncidents = incidentRows.length

  // Agregacja per-lokal (w JS — łączymy straty/awarie przez właściciela rekordu).
  const perLoc = new Map(locations.map((l) => [l.id, { id: l.id, name: l.name, wasteMonth: 0, openIncidents: 0, activeNow: 0, scheduledToday: 0, staff: 0 }]))
  for (const r of wasteMonthRows) { const lid = userLoc.get(r.userId); const e = lid && perLoc.get(lid); if (e) e.wasteMonth += r.totalCost || 0 }
  for (const r of incidentRows) { const lid = userLoc.get(r.userId); const e = lid && perLoc.get(lid); if (e) e.openIncidents += 1 }
  for (const s of activeShifts) { const e = s.locationId && perLoc.get(s.locationId); if (e) e.activeNow += 1 }
  for (const s of scheduledShifts) { const e = s.locationId && perLoc.get(s.locationId); if (e) e.scheduledToday += 1 }
  for (const u of users) { const e = u.locationId && perLoc.get(u.locationId); if (e) e.staff += 1 }

  // Ranking lokali: niższe straty i mniej awarii = wyżej. (Pełna rentowność = po integracji POS.)
  const locationRanking = Array.from(perLoc.values())
    .map((l) => ({ ...l, score: Math.round(Math.max(0, 100 - l.wasteMonth / 10 - l.openIncidents * 5)) }))
    .sort((x, y) => y.score - x.score)

  // Magazyn + food cost (pętla pieniędzy)
  const [stockItems, recipes] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { ...org, isActive: true }, include: { supplier: { select: { name: true } } } }),
    prisma.recipe.findMany({ where: org, include: { product: { select: { name: true, price: true } }, items: { include: { inventoryItem: { select: { costPerUnit: true } } } } } }),
  ])

  const lowStock = stockItems.filter((i) => i.minStock > 0 && i.stock <= i.minStock)
  const orderSuggestions = lowStock.map((i) => ({
    product: i.name,
    quantity: Math.max(1, Math.ceil(i.minStock * 2 - i.stock)),
    unit: i.unit,
    supplier: i.supplier?.name || null,
    estCost: Math.round(Math.max(1, i.minStock * 2 - i.stock) * (i.costPerUnit || 0)),
  }))
  const orderTotalCost = orderSuggestions.reduce((s, o) => s + o.estCost, 0)

  const foodCostItems = recipes
    .map((r) => {
      const total = r.items.reduce((s, it) => s + it.quantity * (it.inventoryItem?.costPerUnit || 0), 0)
      const per = r.yield > 0 ? total / r.yield : total
      const price = r.product?.price || 0
      return { name: r.product?.name || '—', costPerUnit: Math.round(per * 100) / 100, price, pct: price > 0 ? Math.round((per / price) * 100) : null }
    })
    .filter((x) => x.pct != null)
  const avgFoodCost = foodCostItems.length ? Math.round(foodCostItems.reduce((s, x) => s + (x.pct || 0), 0) / foodCostItems.length) : null

  // Finanse z POS/sprzedaży
  const [salesTodayRows, salesYestRows, salesWeekAgg, posConn, costMap] = await Promise.all([
    prisma.sale.findMany({ where: { ...org, soldAt: { gte: startToday } }, include: { items: { select: { productId: true, quantity: true } } } }),
    prisma.sale.aggregate({ where: { ...org, soldAt: { gte: startYesterday, lt: startToday } }, _sum: { total: true } }),
    prisma.sale.aggregate({ where: { ...org, soldAt: { gte: weekAgo } }, _sum: { total: true } }),
    prisma.posConnection.findUnique({ where: { organizationId: user.organizationId } }),
    productCostMap(user.organizationId),
  ])
  const salesToday = Math.round(salesTodayRows.reduce((s, x) => s + x.total, 0))
  const salesYesterday = Math.round(salesYestRows._sum.total || 0)
  const salesWeek = Math.round(salesWeekAgg._sum.total || 0)
  const cogsToday = cogsFor(salesTodayRows.flatMap((s) => s.items), costMap)
  const hasSales = salesToday > 0
  const profitToday = hasSales ? Math.round(salesToday - cogsToday) : null
  const marginPct = hasSales ? Math.round(((salesToday - cogsToday) / salesToday) * 100) : null
  const foodCostActualPct = hasSales ? Math.round((cogsToday / salesToday) * 100) : null
  const posConnected = !!posConn?.connected

  // Skrzynka decyzji (reguły) — wstęp do AI COO. Każda decyzja ma akcję.
  type Dec = { id: string; severity: 'high' | 'medium' | 'low'; title: string; detail: string; href: string; cta: string }
  const decisions: Dec[] = []
  if (openIncidents > 0) decisions.push({ id: 'inc', severity: 'high', title: `${openIncidents} otwarta(e) awaria(e)`, detail: 'Sprzęt może blokować sprzedaż — zajmij się najpilniejszymi.', href: '/owner/incidents', cta: 'Przejrzyj' })
  if (wasteTodayCost > 50) decisions.push({ id: 'waste', severity: 'high', title: `Wysokie straty dziś: ${wasteTodayCost.toFixed(0)} zł`, detail: topProducts[0] ? `Najwięcej tracisz na: ${topProducts[0].product}.` : 'Sprawdź przyczyny strat.', href: '/owner/waste', cta: 'Analiza' })
  if (pendingVacations > 0) decisions.push({ id: 'vac', severity: 'medium', title: `${pendingVacations} wniosek(ów) urlopowy(ch)`, detail: 'Czekają na decyzję — brak odpowiedzi blokuje planowanie grafiku.', href: '/owner/vacations', cta: 'Rozpatrz' })
  if (wasteYesterdayCost > 0 && wasteTodayCost > wasteYesterdayCost * 1.5) decisions.push({ id: 'trend', severity: 'medium', title: 'Straty rosną dzień do dnia', detail: `Dziś ${wasteTodayCost.toFixed(0)} zł vs wczoraj ${wasteYesterdayCost.toFixed(0)} zł.`, href: '/owner/waste', cta: 'Sprawdź' })
  if (topProducts[0] && topProducts[0].cost > 0 && !decisions.find((d) => d.id === 'waste')) decisions.push({ id: 'waste-top', severity: 'low', title: `Najwięcej strat w m-cu: ${topProducts[0].product}`, detail: `${topProducts[0].cost.toFixed(0)} zł — rozważ mniejszą produkcję lub promocję.`, href: '/owner/waste', cta: 'Analiza' })
  if (lowStock.length > 0) decisions.push({ id: 'order', severity: 'high', title: `${lowStock.length} pozycji poniżej minimum`, detail: `Sugerowane zamówienie ok. ${orderTotalCost} zł — uniknij braków.`, href: '/owner/warehouse', cta: 'Zamów' })
  if (foodCostActualPct != null && foodCostActualPct > 35) decisions.push({ id: 'fc-real', severity: 'high', title: `Food cost rzeczywisty: ${foodCostActualPct}%`, detail: 'Liczony ze sprzedaży przekracza 35% — sprawdź porcje, ceny i straty.', href: '/owner/recipes', cta: 'Receptury' })
  else if (avgFoodCost != null && avgFoodCost > 35) decisions.push({ id: 'fc', severity: 'medium', title: `Wysoki food cost: ${avgFoodCost}%`, detail: 'Średnia z receptur przekracza 35% — sprawdź ceny składników i porcje.', href: '/owner/recipes', cta: 'Receptury' })
  if (openTasks > 0) decisions.push({ id: 'tasks', severity: 'low', title: `${openTasks} otwarte zadanie(a)`, detail: 'Część może wymagać Twojej decyzji lub przydziału.', href: '/owner/tasks', cta: 'Zobacz' })

  const wasteTrendPct = wasteYesterdayCost > 0 ? Math.round(((wasteTodayCost - wasteYesterdayCost) / wasteYesterdayCost) * 100) : null

  return NextResponse.json({
    finance: {
      posConnected,
      salesToday: posConnected ? salesToday : null,
      salesYesterday: posConnected ? salesYesterday : null,
      salesWeek: posConnected ? salesWeek : null,
      profitToday,
      marginPct,
      foodCostPct: foodCostActualPct ?? avgFoodCost,
      laborCostPct: null,
    },
    waste: { today: wasteTodayCost, yesterday: wasteYesterdayCost, week: wasteWeekCost, month: wasteMonthCost, trendPct: wasteTrendPct, topProducts },
    foodCost: { avgPct: avgFoodCost, items: foodCostItems },
    locations: locationRanking,
    ordering: { configured: stockItems.length > 0, lowCount: lowStock.length, totalCost: orderTotalCost, suggestions: orderSuggestions },
    attention: { openIncidents, pendingVacations, openTasks },
    team: { totalEmployees, activeNow: activeShifts.length, scheduledToday: scheduledShifts.length },
    decisions,
  })
})
