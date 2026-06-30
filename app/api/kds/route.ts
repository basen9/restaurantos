export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, orgScope } from '@/lib/api'
import { minutesSince } from '@/lib/floor'
import { prisma } from '@/lib/prisma'

// Ekran kuchni (KDS): aktywne pozycje (oczekuje/w przygotowaniu/gotowe) ze wszystkich
// otwartych rachunków, z nazwą stolika i wiekiem — sortowane od najstarszych.
export const GET = handle(async () => {
  const user = await requireAuth()
  const items = await prisma.tableOrderItem.findMany({
    where: { status: { in: ['PENDING', 'PREPARING', 'READY'] }, voided: false, order: { ...orgScope(user), status: 'OPEN' } },
    include: { order: { select: { table: { select: { name: true, zone: { select: { name: true } } } } } } },
    orderBy: { createdAt: 'asc' },
    take: 300,
  })
  const now = Date.now()
  return NextResponse.json(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      notes: i.notes,
      kind: i.kind,
      quantity: i.quantity,
      status: i.status,
      ageMin: minutesSince(i.createdAt, now),
      table: i.order?.table?.name || '—',
      zone: i.order?.table?.zone?.name || '',
    })),
  )
})
