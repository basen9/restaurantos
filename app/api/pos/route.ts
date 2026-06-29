export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const conn = await prisma.posConnection.findUnique({ where: { organizationId: user.organizationId } })
  return NextResponse.json(conn || { connected: false, provider: null, lastSyncAt: null })
})

// Mock-sync: generuje realistyczną dzisiejszą sprzedaż z katalogu produktów.
// Architektura gotowa pod realnych providerów (toast/square/gopos) — wymienia się tylko generator.
export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.VIEW_FINANCE)

  const [products, locations] = await Promise.all([
    prisma.product.findMany({ where: { ...orgScope(user), isActive: true, price: { gt: 0 } }, select: { id: true, name: true, price: true } }),
    prisma.location.findMany({ where: { ...orgScope(user), isActive: true }, select: { id: true } }),
  ])
  if (products.length === 0) throw new ApiError(400, 'Brak produktów z ceną — dodaj ceny w katalogu, aby zsynchronizować sprzedaż.')

  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)

  // Idempotencja: usuń dzisiejszą sprzedaż MOCK przed regeneracją.
  await prisma.sale.deleteMany({ where: { ...orgScope(user), source: 'MOCK', soldAt: { gte: start, lte: end } } })

  const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
  const txCount = rint(25, 45)
  const sales = []
  for (let i = 0; i < txCount; i++) {
    const lines = rint(1, 3)
    const items = []
    for (let j = 0; j < lines; j++) {
      const p = products[rint(0, products.length - 1)]
      const qty = rint(1, 3)
      items.push({ productId: p.id, name: p.name, quantity: qty, unitPrice: p.price, total: Math.round(qty * p.price * 100) / 100 })
    }
    const total = items.reduce((s, it) => s + it.total, 0)
    const soldAt = new Date(start.getTime() + rint(7 * 60, 20 * 60) * 60 * 1000) // 7:00–20:00
    const locationId = locations.length ? locations[rint(0, locations.length - 1)].id : null
    sales.push({ total, soldAt, items, locationId })
  }

  await prisma.$transaction(
    sales.map((s, idx) =>
      prisma.sale.create({
        data: { organizationId: user.organizationId, locationId: s.locationId, soldAt: s.soldAt, total: s.total, source: 'MOCK', externalId: `mock-${s.soldAt.getTime()}-${idx}`, items: { create: s.items } },
      }),
    ),
  )

  const conn = await prisma.posConnection.upsert({
    where: { organizationId: user.organizationId },
    update: { connected: true, provider: 'mock', lastSyncAt: new Date() },
    create: { organizationId: user.organizationId, connected: true, provider: 'mock', lastSyncAt: new Date() },
  })
  await audit(user, 'pos.sync', 'PosConnection', conn.id, { provider: 'mock', transactions: txCount })

  const revenue = sales.reduce((s, x) => s + x.total, 0)
  return NextResponse.json({ ok: true, transactions: txCount, revenue: Math.round(revenue * 100) / 100, connection: conn })
})
