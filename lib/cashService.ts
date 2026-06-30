// Serwis rozliczenia zmiany kasowej: otwarcie, ruchy gotówkowe, zamknięcie z przeliczeniem.
import { prisma } from './prisma'
import { sumMovements, expectedCash, cashVariance } from './cash'
import { audit } from './audit'
import { ApiError, orgScope, type AuthUser } from './api'

type U = Pick<AuthUser, 'id' | 'organizationId'> & { locationId?: string | null }

// Sprzedaż gotówkowa w oknie zmiany (paymentMethod CASH).
async function cashSalesSince(orgId: string, from: Date, to: Date) {
  const agg = await prisma.sale.aggregate({ where: { organizationId: orgId, paymentMethod: 'CASH', soldAt: { gte: from, lte: to } }, _sum: { total: true } })
  return Math.round((agg._sum.total || 0) * 100) / 100
}

export async function getOpenSession(user: U) {
  const s = await prisma.cashSession.findFirst({ where: { ...orgScope(user), status: 'OPEN' }, include: { movements: { orderBy: { createdAt: 'desc' } } }, orderBy: { openedAt: 'desc' } })
  if (!s) return null
  const { paidIn, paidOut } = sumMovements(s.movements)
  const cashSales = await cashSalesSince(user.organizationId, s.openedAt, new Date())
  return { ...s, cashSales, paidIn, paidOut, expectedCash: expectedCash(s.openingFloat, cashSales, paidIn, paidOut) }
}

export async function recentSessions(user: U) {
  return prisma.cashSession.findMany({ where: { ...orgScope(user), status: 'CLOSED' }, orderBy: { closedAt: 'desc' }, take: 20 })
}

export async function openSession(user: U, openingFloat: number, locationId?: string) {
  const existing = await prisma.cashSession.findFirst({ where: { ...orgScope(user), status: 'OPEN' }, select: { id: true } })
  if (existing) throw new ApiError(409, 'Zmiana kasowa jest już otwarta — najpierw ją zamknij.')
  const s = await prisma.cashSession.create({ data: { organizationId: user.organizationId, locationId: locationId ?? user.locationId ?? null, openingFloat, openedById: user.id } })
  await audit(user, 'cash.open', 'CashSession', s.id, { openingFloat })
  return s
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
  const now = new Date()
  const { paidIn, paidOut } = sumMovements(s.movements)
  const cashSales = await cashSalesSince(user.organizationId, s.openedAt, now)
  const expected = expectedCash(s.openingFloat, cashSales, paidIn, paidOut)
  const variance = cashVariance(countedCash, expected)

  // Atomowy guard: tylko jedno zamknięcie wygrywa.
  const claimed = await prisma.cashSession.updateMany({
    where: { id: sessionId, status: 'OPEN' },
    data: { status: 'CLOSED', closedAt: now, closedById: user.id, cashSales, paidIn, paidOut, expectedCash: expected, countedCash, variance, notes: notes ?? null },
  })
  if (claimed.count === 0) return prisma.cashSession.findUnique({ where: { id: sessionId } })
  await audit(user, 'cash.close', 'CashSession', sessionId, { expected, countedCash, variance })
  return prisma.cashSession.findUnique({ where: { id: sessionId } })
}
