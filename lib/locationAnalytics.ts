// Analityka per-lokal: przychód, koszt pracy, straty, awarie, obsada + ranking.
import { prisma } from './prisma'
import { productCostMap, cogsFor } from './finance'

export interface LocationRow {
  id: string
  name: string
  revenueToday: number
  revenueWeek: number
  marginPct: number | null
  laborToday: number
  laborPct: number | null
  wasteMonth: number
  openIncidents: number
  headcount: number
  activeNow: number
  score: number
}

// Ranking: rentowność (marża) > niskie straty > mało awarii. Pure → testowalne.
export function rankLocations(rows: Omit<LocationRow, 'score'>[]): LocationRow[] {
  return rows
    .map((r) => {
      const marginScore = r.marginPct != null ? r.marginPct : 50 // brak danych = neutralnie
      const score = Math.round(Math.max(0, marginScore - r.wasteMonth / 20 - r.openIncidents * 5))
      return { ...r, score }
    })
    .sort((a, b) => b.score - a.score)
}

export async function getLocationsBreakdown(organizationId: string): Promise<LocationRow[]> {
  const org = { organizationId }
  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [locations, users, salesToday, salesWeek, costMap, wasteRows, incidentRows, activeShifts] = await Promise.all([
    prisma.location.findMany({ where: { ...org, isActive: true }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: org, select: { id: true, locationId: true } }),
    prisma.sale.findMany({ where: { ...org, soldAt: { gte: startToday } }, select: { locationId: true, total: true, items: { select: { productId: true, quantity: true } } } }),
    prisma.sale.groupBy({ by: ['locationId'], where: { ...org, soldAt: { gte: weekAgo } }, _sum: { total: true } }),
    productCostMap(organizationId),
    prisma.wasteReport.findMany({ where: { ...org, date: { gte: monthStart } }, select: { totalCost: true, userId: true } }),
    prisma.incident.findMany({ where: { ...org, status: 'OPEN' }, select: { userId: true } }),
    prisma.shift.findMany({ where: { ...org, status: 'ACTIVE' }, select: { locationId: true } }),
  ])

  const userLoc = new Map(users.map((u) => [u.id, u.locationId]))
  const weekByLoc = new Map(salesWeek.map((s) => [s.locationId, s._sum.total || 0]))

  const rows = await Promise.all(
    locations.map(async (loc) => {
      const locSales = salesToday.filter((s) => s.locationId === loc.id)
      const revenueToday = Math.round(locSales.reduce((a, s) => a + s.total, 0))
      const cogs = cogsFor(locSales.flatMap((s) => s.items), costMap)
      const marginPct = revenueToday > 0 ? Math.round(((revenueToday - cogs) / revenueToday) * 100) : null
      const locLabor = await locationLaborToday(organizationId, loc.id, startToday, endToday)
      const wasteMonth = Math.round(wasteRows.filter((w) => userLoc.get(w.userId) === loc.id).reduce((a, w) => a + (w.totalCost || 0), 0))
      const openIncidents = incidentRows.filter((i) => userLoc.get(i.userId) === loc.id).length
      const headcount = users.filter((u) => u.locationId === loc.id).length
      const activeNow = activeShifts.filter((s) => s.locationId === loc.id).length
      return {
        id: loc.id,
        name: loc.name,
        revenueToday,
        revenueWeek: Math.round(weekByLoc.get(loc.id) || 0),
        marginPct,
        laborToday: locLabor,
        laborPct: revenueToday > 0 ? Math.round((locLabor / revenueToday) * 100) : null,
        wasteMonth,
        openIncidents,
        headcount,
        activeNow,
      }
    }),
  )
  return rankLocations(rows)
}

// Koszt pracy danego lokalu (zmiany w lokalu × stawka).
async function locationLaborToday(organizationId: string, locationId: string, from: Date, to: Date): Promise<number> {
  const shifts = await prisma.shift.findMany({
    where: { organizationId, locationId, date: { gte: from, lte: to }, status: { in: ['COMPLETED', 'ACTIVE'] } },
    include: { user: { select: { hourlyRate: true } } },
  })
  let cost = 0
  for (const s of shifts) {
    let mins = 0
    if (s.actualStart && s.actualEnd) mins = (s.actualEnd.getTime() - s.actualStart.getTime()) / 60000
    else if (s.actualStart && s.status === 'ACTIVE') mins = (Date.now() - s.actualStart.getTime()) / 60000
    else { const [h1, m1] = s.startTime.split(':').map(Number); const [h2, m2] = s.endTime.split(':').map(Number); mins = Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1)) }
    cost += (mins / 60) * (s.user?.hourlyRate || 0)
  }
  return Math.round(cost)
}
