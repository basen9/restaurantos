export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, orgScope } from '@/lib/api'
import { summarizeOrder } from '@/lib/floor'
import { prisma } from '@/lib/prisma'

// Plan sali: strefy → stoliki → podsumowanie otwartego rachunku (na żywo).
export const GET = handle(async () => {
  const user = await requireAuth()
  const zones = await prisma.zone.findMany({
    where: orgScope(user),
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      tables: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { orders: { where: { status: 'OPEN' }, include: { items: true }, take: 1 } },
      },
    },
  })
  const now = Date.now()
  const out = zones.map((z) => ({
    id: z.id,
    name: z.name,
    locationId: z.locationId,
    tables: z.tables.map((t) => {
      const open = t.orders[0]
      return {
        id: t.id,
        name: t.name,
        seats: t.seats,
        occupied: !!open,
        orderId: open?.id || null,
        summary: open ? summarizeOrder(open.items, now) : null,
      }
    }),
  }))
  return NextResponse.json(out)
})
