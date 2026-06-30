// Serwis zamówień przy stoliku: otwieranie rachunku, dopisywanie pozycji,
// zmiana statusu pozycji, zamknięcie rachunku (z utworzeniem sprzedaży — pętla pieniądza).
import { prisma } from './prisma'
import { orderTotal } from './floor'
import { round2 } from './finance'
import { totalVatGross } from './tax'
import { audit } from './audit'
import { ApiError, orgScope, type AuthUser } from './api'

type U = Pick<AuthUser, 'id' | 'organizationId'>

async function assertTable(user: U, tableId: string) {
  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, ...orgScope(user) }, select: { id: true } })
  if (!table) throw new ApiError(404, 'Stolik nie istnieje')
  return table
}

// Otwarty rachunek stolika (lub null).
export async function getOpenOrder(user: U, tableId: string) {
  await assertTable(user, tableId)
  return prisma.tableOrder.findFirst({
    where: { tableId, ...orgScope(user), status: 'OPEN' },
    include: { items: { orderBy: { createdAt: 'asc' } } },
    orderBy: { openedAt: 'desc' },
  })
}

// Dopisuje pozycje; otwiera rachunek, jeśli stolik go nie ma. Atomowo.
export async function addItems(user: U, tableId: string, items: { productId?: string; name: string; notes?: string; kind: 'FOOD' | 'DRINK'; quantity: number; unitPrice: number }[]) {
  await assertTable(user, tableId)

  // Walidacja, że podane productId należą do organizacji (denormalizujemy referencję)
  // + pobranie stawki VAT produktu (kopiowanej na pozycję).
  const ids = Array.from(new Set(items.map((i) => i.productId).filter(Boolean))) as string[]
  const validIds = new Set<string>()
  const vatById = new Map<string, number>()
  if (ids.length) {
    const found = await prisma.product.findMany({ where: { id: { in: ids }, ...orgScope(user) }, select: { id: true, vatRate: true } })
    found.forEach((p) => { validIds.add(p.id); vatById.set(p.id, p.vatRate) })
  }

  const order = await prisma.$transaction(async (tx) => {
    let o = await tx.tableOrder.findFirst({ where: { tableId, ...orgScope(user), status: 'OPEN' }, select: { id: true } })
    if (!o) o = await tx.tableOrder.create({ data: { organizationId: user.organizationId, tableId, openedById: user.id }, select: { id: true } })
    await tx.tableOrderItem.createMany({
      data: items.map((i) => {
        const validPid = i.productId && validIds.has(i.productId) ? i.productId : null
        return { orderId: o!.id, productId: validPid, name: i.name, notes: i.notes || null, kind: i.kind, quantity: i.quantity, unitPrice: i.unitPrice, vatRate: validPid ? (vatById.get(validPid) ?? 8) : 8 }
      }),
    })
    const all = await tx.tableOrderItem.findMany({ where: { orderId: o.id } })
    await tx.tableOrder.update({ where: { id: o.id }, data: { total: orderTotal(all) } })
    return tx.tableOrder.findUnique({ where: { id: o.id }, include: { items: { orderBy: { createdAt: 'asc' } } } })
  })
  await audit(user, 'order.addItems', 'TableOrder', order!.id, { count: items.length })
  return order
}

// Zmiana statusu pojedynczej pozycji (kuchnia/kelner). Weryfikuje przynależność do org.
export async function setItemStatus(user: U, itemId: string, status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED') {
  const item = await prisma.tableOrderItem.findFirst({ where: { id: itemId, order: { ...orgScope(user) } }, select: { id: true } })
  if (!item) throw new ApiError(404, 'Pozycja nie istnieje')
  const updated = await prisma.tableOrderItem.update({ where: { id: itemId }, data: { status } })
  await audit(user, 'orderItem.status', 'TableOrderItem', itemId, { status })
  return updated
}

export interface CloseOpts { discount?: number; tip?: number; paymentMethod?: string; splitCount?: number }

// Zamknięcie rachunku → utworzenie sprzedaży (przychód) + oznaczenie CLOSED. Idempotentne.
// Przychód (Sale.total) = NETTO po rabacie, BEZ napiwku — żeby analityka/food cost były poprawne.
export async function closeOrder(user: U & { locationId?: string | null }, orderId: string, opts: CloseOpts = {}) {
  const order = await prisma.tableOrder.findFirst({
    where: { id: orderId, ...orgScope(user) },
    include: { items: true, table: { select: { name: true, zone: { select: { locationId: true } } } } },
  })
  if (!order) throw new ApiError(404, 'Rachunek nie istnieje')
  if (order.status === 'CLOSED') return order
  if (order.items.length === 0) throw new ApiError(400, 'Pusty rachunek — dodaj pozycje przed zamknięciem')

  const subtotal = orderTotal(order.items)
  const discount = Math.min(round2(opts.discount || 0), subtotal) // rabat nie większy niż wartość rachunku
  const tip = round2(opts.tip || 0)
  const netTotal = round2(subtotal - discount) // przychód brutto do analityki (bez napiwku)
  // Rabat rozkładamy proporcjonalnie na pozycje; zapisujemy brutto po rabacie na SaleItem,
  // dzięki czemu VAT na Sale i rozbicie w raporcie liczone są z TYCH SAMYCH kwot (reconcile).
  const discountFactor = subtotal > 0 ? netTotal / subtotal : 1
  const adjusted = order.items.map((i) => ({ ...i, adjGross: round2(i.quantity * i.unitPrice * discountFactor) }))
  const vat = totalVatGross(adjusted.map((i) => ({ gross: i.adjGross, vatRate: i.vatRate })))
  const splitCount = opts.splitCount && opts.splitCount > 0 ? opts.splitCount : 1
  // Przychód przypisujemy do lokalu STOLIKA (strefy), nie zamykającego użytkownika.
  const locationId = order.table?.zone?.locationId ?? user.locationId ?? null

  const result = await prisma.$transaction(async (tx) => {
    // Atomowy guard: tylko jedno zamknięcie wygrywa.
    const claimed = await tx.tableOrder.updateMany({ where: { id: order.id, status: 'OPEN' }, data: { status: 'CLOSED', closedAt: new Date(), total: netTotal } })
    if (claimed.count === 0) return null

    const sale = await tx.sale.create({
      data: {
        organizationId: user.organizationId,
        locationId,
        total: netTotal,
        subtotal,
        discount,
        vat,
        tip,
        paymentMethod: opts.paymentMethod || null,
        splitCount,
        source: 'POS',
        // total = brutto po rabacie (reconciluje z Sale.total i z rozbiciem VAT w raporcie).
        items: { create: adjusted.map((i) => ({ productId: i.productId || null, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.adjGross, vatRate: i.vatRate })) },
      },
    })
    await tx.tableOrder.update({ where: { id: order.id }, data: { saleId: sale.id } })
    // Oznacz POS jako połączone — bez tego analityka/AI COO/alerty pomijają przychód z sali.
    await tx.posConnection.upsert({
      where: { organizationId: user.organizationId },
      create: { organizationId: user.organizationId, provider: 'floor', connected: true, lastSyncAt: new Date() },
      update: { connected: true, lastSyncAt: new Date() },
    })
    return sale
  })

  if (result) await audit(user, 'order.close', 'TableOrder', order.id, { subtotal, discount, tip, total: netTotal, paymentMethod: opts.paymentMethod, saleId: result.id, table: order.table?.name })
  return prisma.tableOrder.findUnique({ where: { id: order.id }, include: { items: true } })
}
