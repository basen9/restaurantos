export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { alertDecisionSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  // Zmiana stanu alertu to operacja zarządcza (nie odczyt) — wymaga MANAGE_ORG,
  // by rola czysto-odczytowa (np. księgowa z analytics.view) nie zamykała alertów operacyjnych.
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const { status } = parseBody(alertDecisionSchema, await req.json())
  const existing = await prisma.alert.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'Alert not found')
  const alert = await prisma.alert.update({ where: { id: params.id }, data: { status, resolvedAt: new Date() } })
  return NextResponse.json(alert)
})
