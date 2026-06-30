export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// Raport storn (loss prevention): anulowane pozycje z powodem i wartością.
export const GET = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('days') || '30', 10) || 30, 1), 365)
  const from = new Date(); from.setDate(from.getDate() - days); from.setHours(0, 0, 0, 0)
  const items = await prisma.tableOrderItem.findMany({
    where: { voided: true, voidedAt: { gte: from }, order: { ...orgScope(user) } },
    orderBy: { voidedAt: 'desc' },
    take: 2000,
  })
  const rows = items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, amount: Math.round(i.quantity * i.unitPrice * 100) / 100, reason: i.voidReason, voidedAt: i.voidedAt }))
  const totalValue = Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100
  return NextResponse.json({ count: rows.length, totalValue, rows })
})
