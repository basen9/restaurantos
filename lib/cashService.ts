// Serwis rozliczenia zmiany kasowej: otwarcie, ruchy gotówkowe, zamknięcie z przeliczeniem.
import { prisma } from './prisma'
import { sumMovements, expectedCash, cashVariance, round2 } from './cash'
import { audit } from './audit'
import { ApiError, orgScope, type AuthUser } from './api'

type U = Pick<AuthUser, 'id' | 'organizationId'> & { locationId?: string | null }

// Sprzedaż gotówkowa w oknie zmiany (paymentMethod CASH), zawężona do lokalu zmiany.
// Napiwki gotówkowe fizycznie trafiają do szuflady, więc wliczamy je do oczekiwanej gotówki.
async function cashSalesSince(orgId: string, locationId: string | null, from: Date, to: Date) {
  const where: any = { organizationId: orgId, paymentMethod: 'CASH', soldAt: { gte: from, lte: to } }
  if (locationId) where.locationId = locationId
  const agg = await prisma.sale.aggregate({ where, _sum: { total: true, tip: true } })
  return round2((agg._sum.total || 0) + (agg._sum.tip || 0))
}

export async function getOpenSession(user: U) {
  const s = await prisma.cashSession.findFirst({ where: { ...orgScope(user), status: 'OPEN' }, include: { movements: { orderBy: { createdAt: 'desc' } } }, orderBy: { openedAt: 'desc' } })
  if (!s) return null
  const { paidIn, paidOut } = sumMovements(s.movements)
  const cashSales = await cashSalesSince(user.organizationId, s.locationId, s.openedAt, new Date())
  return { ...s, cashSales, paidIn, paidOut, expectedCash: expectedCash(s.openingFloat, cashSales, paidIn, paidOut) }
}

export async function recentSessions(user: U) {
  return prisma.cashSession.findMany({ where: { ...orgScope(user), status: 'CLOSED' }, orderBy: { closedAt: 'desc' }, take: 20 })
}

export async function openSession(user: U, openingFloat: number, locationId?: string) {
  const loc = locationId ?? user.locationId ?? null
  // Sprawdzenie aplikacyjne (czytelny błąd) + twardy guard: częściowy unikalny indeks
  // (organizationId, locationId) WHERE status='OPEN' — wyścig dwóch otwarć złapiemy jako P2002.
  const existing = await prisma.cashSession.findFirst({ where: { ...orgScope(user), status: 'OPEN', locationId: loc }, select: { id: true } })
  if (existing) throw new ApiError(409, 'Zmiana kasowa jest już otwarta — najpierw ją zamknij.')
  try {
    const s = await prisma.cashSession.create({ data: { organizationId: user.organizationId, locationId: loc, openingFloat, openedById: user.id } })
    await audit(user, 'cash.open', 'CashSession', s.id, { openingFloat })
    return s
  } catch (e: any) {
    if (e?.code === 'P2002') throw new ApiError(409, 'Zmiana kasowa jest już otwarta — najpierw ją zamknij.')
    throw e
  }
}

export async function addMovement(user: U, sessionId: string, type: 'IN' | 'OUT', amount: number, reason?: string) {
  const s = await prisma.cashSession.findFirst({ where: { id: sessionId, ...orgScope(user), status: 'OPEN' }, select: { id: true } })
  if (!s) throw new ApiError(404, 'Otwarta zmiana nie istnieje')
  const m = await prisma.cashMovement.create({ data: { sessionId, type, amount, reason, userId: user.id } })
  await audit(user, 'cash.movement', 'CashSession', sessionId, { type, amount })
  return m
}

export async function closeSession(user: U, sessionId: string, countedCash: number, notes?: string) {
  const s = await prisma.cashSession.findFirst({ where: { id: sessionId, ...orgScope(user) }, include: { movements: true } })
  if (!s) throw new ApiError(404, 'Zmiana nie istnieje')
  if (s.status === 'CLOSED') return s
  const now = new Date() // jedna granica okna: sprzedaż liczona do closedAt
  const { paidIn, paidOut } = sumMovements(s.movements)
  const cashSales = await cashSalesSince(user.organizationId, s.locationId, s.openedAt, now)
  const expected = expectedCash(s.openingFloat, cashSales, paidIn, paidOut)
  const variance = cashVariance(countedCash, expected)

  // Atomowy guard: tylko jedno zamknięcie wygrywa.
  const claimed = await prisma.cashSession.updateMany({
    where: { id: sessionId, status: 'OPEN' },
    data: { status: 'CLOSED', closedAt: now, closedById: user.id, cashSales, paidIn, paidOut, expectedCash: expected, countedCash, variance, notes: notes ?? null },
  })
  if (claimed.count === 0) return prisma.cashSession.findFirst({ where: { id: sessionId, ...orgScope(user) } })
  await audit(user, 'cash.close', 'CashSession', sessionId, { expected, countedCash, variance })
  return prisma.cashSession.findFirst({ where: { id: sessionId, ...orgScope(user) } })
}
