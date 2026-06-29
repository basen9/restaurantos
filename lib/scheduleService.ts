// Serwis grafiku: prognoza popytu z historii sprzedaży + generowanie tygodnia.
import { prisma } from './prisma'
import { avgRevenueByDow, recommendedHeadcount, assignEmployees, type StaffingParams } from './scheduling'

const DEFAULTS = { targetLaborPct: 0.25, shiftHours: 8, startTime: '08:00', endTime: '16:00', weeksBack: 4 }

export async function getForecast(organizationId: string) {
  const from = new Date()
  from.setDate(from.getDate() - DEFAULTS.weeksBack * 7)

  const [sales, emps] = await Promise.all([
    prisma.sale.findMany({ where: { organizationId, soldAt: { gte: from } }, select: { soldAt: true, total: true } }),
    prisma.user.findMany({ where: { organizationId, role: 'EMPLOYEE', isActive: true }, select: { hourlyRate: true } }),
  ])

  const samples = sales.map((s) => ({ dow: new Date(s.soldAt).getDay(), date: new Date(s.soldAt).toISOString().slice(0, 10), value: s.total }))
  const byDowRevenue = avgRevenueByDow(samples)
  const rates = emps.map((e) => e.hourlyRate).filter((r) => r > 0)
  const avgHourlyRate = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 35
  const params: StaffingParams = { targetLaborPct: DEFAULTS.targetLaborPct, avgHourlyRate, shiftHours: DEFAULTS.shiftHours }

  const byDow = byDowRevenue.map((rev, dow) => ({ dow, forecastRevenue: rev, recommendedHeadcount: recommendedHeadcount(rev, params) }))
  return { avgHourlyRate, targetLaborPct: DEFAULTS.targetLaborPct, hasSalesHistory: sales.length > 0, byDow }
}

// Generuje grafik na tydzień (Schedule DRAFT + Shifts) wg prognozy i dostępności.
export async function generateWeek(user: { id: string; organizationId: string }, weekStart: Date) {
  const org = { organizationId: user.organizationId }
  const [forecast, employees, availability, location] = await Promise.all([
    getForecast(user.organizationId),
    prisma.user.findMany({ where: { ...org, role: 'EMPLOYEE', isActive: true }, select: { id: true, locationId: true } }),
    prisma.availability.findMany({ where: org, select: { userId: true, dayOfWeek: true, available: true } }),
    prisma.location.findFirst({ where: org, select: { id: true } }),
  ])
  if (!location) throw new Error('Brak lokalu')
  if (employees.length === 0) throw new Error('Brak pracowników')

  // Mapa dostępności: Availability.dayOfWeek 0=pon..6=niedz → konwersja na JS getDay (0=niedz).
  const hasAvail = availability.length > 0
  const availSet = new Set(availability.filter((a) => a.available).map((a) => `${a.userId}:${(a.dayOfWeek + 1) % 7}`))

  const monday = new Date(weekStart)
  monday.setHours(0, 0, 0, 0)

  // Idempotencja: usuń poprzedni DRAFT na ten tydzień (wraz ze zmianami).
  const existing = await prisma.schedule.findFirst({ where: { ...org, locationId: location.id, weekStart: monday, status: 'DRAFT' } })
  if (existing) {
    await prisma.shift.deleteMany({ where: { scheduleId: existing.id } })
    await prisma.schedule.delete({ where: { id: existing.id } })
  }

  const schedule = await prisma.schedule.create({ data: { organizationId: user.organizationId, locationId: location.id, weekStart: monday, status: 'DRAFT' } })

  const shiftsData: any[] = []
  const summary: { date: string; dow: number; recommended: number; assigned: number }[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dow = date.getDay()
    const rec = forecast.byDow[dow].recommendedHeadcount
    const candidates = employees.filter((e) => !hasAvail || availSet.has(`${e.id}:${dow}`)).map((e) => e.id)
    const assigned = assignEmployees(candidates, rec, i)
    for (const userId of assigned) {
      const loc = employees.find((e) => e.id === userId)?.locationId || location.id
      shiftsData.push({ organizationId: user.organizationId, scheduleId: schedule.id, userId, locationId: loc, date, startTime: '08:00', endTime: '16:00', status: 'SCHEDULED' })
    }
    summary.push({ date: date.toISOString().slice(0, 10), dow, recommended: rec, assigned: assigned.length })
  }
  if (shiftsData.length) await prisma.shift.createMany({ data: shiftsData })

  return { scheduleId: schedule.id, weekStart: monday.toISOString().slice(0, 10), totalShifts: shiftsData.length, days: summary }
}

export async function getCoverage(organizationId: string, weekStart: Date) {
  const forecast = await getForecast(organizationId)
  const monday = new Date(weekStart); monday.setHours(0, 0, 0, 0)
  const end = new Date(monday); end.setDate(monday.getDate() + 7)
  const shifts = await prisma.shift.findMany({ where: { organizationId, date: { gte: monday, lt: end } }, select: { date: true } })

  const plannedByDow = Array(7).fill(0)
  for (const s of shifts) plannedByDow[new Date(s.date).getDay()]++

  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday); date.setDate(monday.getDate() + i)
    const dow = date.getDay()
    days.push({ date: date.toISOString().slice(0, 10), dow, recommended: forecast.byDow[dow].recommendedHeadcount, planned: plannedByDow[dow], forecastRevenue: forecast.byDow[dow].forecastRevenue })
  }
  return { weekStart: monday.toISOString().slice(0, 10), days }
}
