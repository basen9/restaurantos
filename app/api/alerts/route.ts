export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const alerts = await prisma.alert.findMany({
    where: { ...orgScope(user), status: 'OPEN' },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  })
  return NextResponse.json(alerts)
})
