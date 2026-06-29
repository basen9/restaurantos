export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handle, requirePermission, parseBody, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const schema = z.object({ ids: z.array(z.string().min(1)).max(200) })

// Atomowa zmiana kolejności stref — sortOrder = pozycja na liście (bez kolizji/wyścigów).
export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_ORG)
  const { ids } = parseBody(schema, await req.json())
  const owned = await prisma.zone.findMany({ where: { id: { in: ids }, ...orgScope(user) }, select: { id: true } })
  const ownedSet = new Set(owned.map((z) => z.id))
  await prisma.$transaction(ids.filter((id) => ownedSet.has(id)).map((id, i) => prisma.zone.update({ where: { id }, data: { sortOrder: i } })))
  return NextResponse.json({ ok: true })
})
