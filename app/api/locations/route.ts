export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { locationSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const locations = await prisma.location.findMany({
    where: { ...orgScope(user), isActive: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  })
  return NextResponse.json(locations)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const data = parseBody(locationSchema, await req.json())
  const location = await prisma.location.create({ data: { organizationId: user.organizationId, ...data } })
  await audit(user, 'location.create', 'Location', location.id, { name: location.name })
  return NextResponse.json(location, { status: 201 })
})
