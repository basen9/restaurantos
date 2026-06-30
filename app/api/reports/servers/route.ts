export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { buildServerReport } from '@/lib/serverReport'
import { loadSettings } from '@/lib/settingsService'
import { prisma } from '@/lib/prisma'

// Raport wyników kelnerów: sprzedaż, średni paragon, napiwki (wg modelu z ustawień).
export const GET = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.VIEW_FINANCE)
  const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('days') || '30', 10) || 30, 1), 365)
  const from = new Date(); from.setDate(from.getDate() - days); from.setHours(0, 0, 0, 0)
  const [sales, settings, users] = await Promise.all([
    prisma.sale.findMany({ where: { ...orgScope(user), soldAt: { gte: from } }, select: { serverId: true, total: true, tip: true }, take: 50000 }),
    loadSettings(user.organizationId),
    prisma.user.findMany({ where: orgScope(user), select: { id: true, name: true } }),
  ])
  const nameById = new Map(users.map((u) => [u.id, u.name]))
  const report = buildServerReport(
    sales.map((s) => ({ serverId: s.serverId, serverName: (s.serverId && nameById.get(s.serverId)) || 'Nieprzypisane', total: s.total, tip: s.tip })),
    settings.tipModel,
  )
  return NextResponse.json(report)
})
