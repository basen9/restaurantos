export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// Dziennik audytu (compliance): kto, co i kiedy zrobił. Tylko właściciel.
export const GET = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const sp = new URL(req.url).searchParams
  const days = Math.min(Math.max(parseInt(sp.get('days') || '7', 10) || 7, 1), 365)
  const action = sp.get('action') || ''
  const from = new Date(); from.setDate(from.getDate() - days)
  const where: any = { ...orgScope(user), createdAt: { gte: from } }
  if (action) where.action = { startsWith: action }
  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json(logs.map((l) => ({ id: l.id, action: l.action, entityType: l.entityType, entityId: l.entityId, metadata: l.metadata, user: l.user?.name || 'system', createdAt: l.createdAt })))
})
