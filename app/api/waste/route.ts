export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { wasteSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async (req) => {
  const user = await requireAuth()
  const canSeeAll = hasPermission(user, PERMISSIONS.VIEW_ALL_WASTE)
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = { ...orgScope(user), ...(canSeeAll ? {} : { userId: user.id }) }
  if (from) where.date = { gte: new Date(from) }
  if (to) where.date = { ...where.date, lte: new Date(to) }

  const reports = await prisma.wasteReport.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(reports)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const data = parseBody(wasteSchema, await req.json())

  // Koszt liczony po stronie serwera — klient nie ustala totalCost.
  const costPerUnit = data.costPerUnit ?? 0
  const totalCost = Math.round(data.quantity * costPerUnit * 100) / 100

  const report = await prisma.wasteReport.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      product: data.product,
      quantity: data.quantity,
      unit: data.unit,
      reason: data.reason,
      costPerUnit,
      totalCost,
      aiDetected: data.aiDetected,
      notes: data.notes,
    },
  })
  return NextResponse.json(report, { status: 201 })
})