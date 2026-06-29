// Serwis zamówień przy stoliku: otwieranie rachunku, dopisywanie pozycji,
// zmiana statusu pozycji, zamknięcie rachunku (z utworzeniem sprzedaży — pętla pieniądza).
import { prisma } from './prisma'
import { orderTotal } from './floor'
import { audit } from './audit'
import { ApiError, type AuthUser } from './api'

type U = Pick<AuthUser, 'id' | 'organizationId'>

async function assertTable(user: U, tableId: string) {
  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, organizationId: user.organizationId }, select: { id: true } })
  if (!table) throw new ApiError(404, 'Stolik nie istnieje')
  return table
}

// Otwarty rachunek stolika (lub null).
export async function getOpenOrder(user: U, tableId: string) {
  await assertTable(user, tableId)
  return prisma.tableOrder.findFirst({
    where: { tableId, organizationId: user.organizationId, status: 'OPEN' },
    include: { items: { orderBy: { createdAt: 'asc' } } },
    orderBy: { openedAt: 'desc' },
  })
}

// Dopisuje pozycje; otwiera rachunek, jeśli stolik go nie ma. Atomowo.
export async function addItems(user: U, tableId: string, items: { productId?: string; name: string; kind: 'FOOD' | 'DRINK'; quantity: number; unitPrice: number }[]) {
  await assertTable(user, tableId)
  return prisma.$transaction(async (tx) => {
    let order = await tx.tableOrder.findFirst({ where: { tableId, organizationId: user.organizationId, status: 'OPEN' }, include: { items: true } })
    if (!order) {
      order = await tx.tableOrder.create({ data: { organizationId: user.organizationId, tableId, openedById: user.id }, include: { items: true } })
    }
    await tx.tableOrderItem.createMany({
      data: items.map((i) => ({ orderId: order!.id, productId: i.productId || null, name: i.name, kind: i.kind, quantity: i.quantity, unitPrice: i.unitPrice })),
    })
    const all = await tx.tableOrderItem.findMany({ where: { orderId: order.id } })
    await tx.tableOrder.update({ where: { id: order.id }, data: { total: orderTotal(all) } })
    return tx.tableOrder.findUnique({ where: { id: order.id }, include: { items: { orderBy: { createdAt: 'asc' } } } })
  })
}

// Zmiana statusu pojedynczej pozycji (kuchnia/kelner). Weryfikuje przynależność do org.
export async function setItemStatus(user: U, itemId: string, status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED') {
  const item = await prisma.tableOrderItem.findFirst({ where: { id: itemId, order: { organizationId: user.organizationId } }, select: { id: true } })
  if (!item) throw new ApiError(404, 'Pozycja nie istnieje')
  return prisma.tableOrderItem.update({ where: { id: itemId }, data: { status } })
}

// Zamknięcie rachunku → utworzenie sprzedaży (przychód) + oznaczenie CLOSED. Idempotentne.
export async function closeOrder(user: U & { locationId?: string | null }, orderId: string) {
  const order = await prisma.tableOrder.findFirst({ where: { id: orderId, organizationId: user.organizationId }, include: { items: true, table: { select: { name: true } } } })
  if (!order) throw new ApiError(404, 'Rachunek nie istnieje')
  if (order.status === 'CLOSED') return order
  if (order.items.length === 0) throw new ApiError(400, 'Pusty rachunek — dodaj pozycje przed zamknięciem')

  const total = orderTotal(order.items)
  const result = await prisma.$transaction(async (tx) => {
    // Atomowy guard: tylko jedno zamknięcie wygrywa.
    const claimed = await tx.tableOrder.updateMany({ where: { id: order.id, status: 'OPEN' }, data: { status: 'CLOSED', closedAt: new Date(), total } })
    if (claimed.count === 0) return null

    const sale = await tx.sale.create({
      data: {
        organizationId: user.organizationId,
        locationId: user.locationId ?? null,
        total,
        source: 'POS',
        items: { create: order.items.map((i) => ({ productId: i.productId || null, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: Math.round(i.quantity * i.unitPrice * 100) / 100 })) },
      },
    })
    await tx.tableOrder.update({ where: { id: order.id }, data: { saleId: sale.id } })
    return sale
  })

  if (result) await audit(user, 'order.close', 'TableOrder', order.id, { total, saleId: result.id, table: order.table?.name })
  return prisma.tableOrder.findUnique({ where: { id: order.id }, include: { items: true } })
}
