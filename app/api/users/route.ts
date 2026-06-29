export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.VIEW_USERS)
  const users = await prisma.user.findMany({
    where: { ...orgScope(user), isActive: true },
    select: { id: true, name: true, email: true, role: true, position: true, locationId: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
})