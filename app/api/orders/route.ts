export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, orgScope, ApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// Historia rachunków stolika (zamknięte), najnowsze pierwsze.
export const GET = handle(async (req) => {
  const user = await requireAuth()
  const tableId = new URL(req.url).searchParams.get('tableId')
  if (!tableId) throw new ApiError(400, 'Brak parametru tableId')
  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, ...orgScope(user) }, select: { id: true } })
  if (!table) throw new ApiError(404, 'Stolik nie istnieje')
  const orders = await prisma.tableOrder.findMany({
    where: { tableId, ...orgScope(user), status: 'CLOSED' },
    include: { items: { orderBy: { createdAt: 'asc' } } },
    orderBy: { closedAt: 'desc' },
    take: 30,
  })
  return NextResponse.json(orders)
})
