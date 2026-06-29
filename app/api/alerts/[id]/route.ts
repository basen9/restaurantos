export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { alertDecisionSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const { status } = parseBody(alertDecisionSchema, await req.json())
  const existing = await prisma.alert.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!existing) throw new ApiError(404, 'Alert not found')
  const alert = await prisma.alert.update({ where: { id: params.id }, data: { status, resolvedAt: new Date() } })
  return NextResponse.json(alert)
})
