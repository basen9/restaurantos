// Serwis zamówień przy stoliku: otwieranie rachunku, dopisywanie pozycji,
// zmiana statusu pozycji, zamknięcie rachunku (z utworzeniem sprzedaży — pętla pieniądza).
import { prisma } from './prisma'
import { orderTotal } from './floor'
import { round2 } from './finance'
import { totalVatGross } from './tax'
import { earnPoints, computeRedemption } from './loyalty'
import { vatFromGross } from './tax'
import { loadSettings } from './settingsService'
import { hasPermission, PERMISSIONS } from './permissions'
import { audit } from './audit'
import { ApiError, orgScope, type AuthUser } from './api'

type U = Pick<AuthUser, 'id' | 'organizationId'>

// Przypisanie/odpięcie gościa do otwartego rachunku.
export async function assignGuest(user: U, orderId: string, guestId: string | null) {
  if (guestId) {
    const g = await prisma.guest.findFirst({ where: { id: guestId, ...orgScope(user) }, select: { id: true } })
    if (!g) throw new ApiError(400, 'Nieprawidłowy gość')
  }
  // Jeden zapis z guardem OPEN + org-scope (bez TOCTOU).
  const res = await prisma.tableOrder.updateMany({ where: { id: orderId, ...orgScope(user), status: 'OPEN' }, data: { guestId } })
  if (res.count === 0) throw new ApiError(404, 'Otwarty rachunek nie istnieje')
  return prisma.tableOrder.findFirst({ where: { id: orderId, ...orgScope(user) } })
}

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
    include: { items: { orderBy: { createdAt: 'asc' } }, guest: { select: { id: true, name: true, points: true } } },
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
  const item = await prisma.tableOrderItem.findFirst({ where: { id: itemId, order: { ...orgScope(user) } }, select: { id: true, voided: true } })
  if (!item) throw new ApiError(404, 'Pozycja nie istnieje')
  if (item.voided) throw new ApiError(400, 'Pozycja jest wystornowana')
  const updated = await prisma.tableOrderItem.update({ where: { id: itemId }, data: { status } })
  await audit(user, 'orderItem.status', 'TableOrderItem', itemId, { status })
  return updated
}

// Konflikt serializacji (równoległe storno + zamknięcie tego samego rachunku) → czytelny 409.
async function serializable<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(fn, { isolationLevel: 'Serializable' })
  } catch (e: any) {
    if (e?.code === 'P2034') throw new ApiError(409, 'Konflikt równoległej operacji na rachunku — spróbuj ponownie.')
    throw e
  }
}

// Storno pozycji (loss prevention): oznacza jako voided + powód; aktualizuje sumę rachunku.
// Nie usuwamy rekordu — zostaje do raportu storn. Wszystkie odczyty i sprawdzenie statusu
// wewnątrz transakcji (Serializable), by storno nie trafiło na zamknięty rachunek.
export async function voidItem(user: U, itemId: string, reason: string) {
  const out = await serializable(async (tx) => {
    const item = await tx.tableOrderItem.findFirst({ where: { id: itemId, order: { ...orgScope(user) } }, include: { order: { select: { id: true, status: true } } } })
    if (!item) throw new ApiError(404, 'Pozycja nie istnieje')
    if (item.order.status !== 'OPEN') throw new ApiError(400, 'Rachunek jest zamknięty')
    if (item.voided) return { item, amount: 0, skipped: true }
    const u = await tx.tableOrderItem.update({ where: { id: itemId }, data: { voided: true, voidReason: reason, voidedById: user.id, voidedAt: new Date() } })
    const all = await tx.tableOrderItem.findMany({ where: { orderId: item.order.id } })
    await tx.tableOrder.update({ where: { id: item.order.id }, data: { total: orderTotal(all) } })
    return { item: u, amount: item.quantity * item.unitPrice, skipped: false }
  })
  if (!out.skipped) await audit(user, 'orderItem.void', 'TableOrderItem', itemId, { reason, amount: out.amount })
  return out.item
}

// Przeniesienie rachunku na inny stolik; jeśli docelowy ma otwarty rachunek — łączenie.
// Wszystko w transakcji Serializable (spójność przy współbieżnej obsłudze).
export async function moveOrder(user: U, orderId: string, targetTableId: string) {
  const out = await serializable(async (tx) => {
    const order = await tx.tableOrder.findFirst({ where: { id: orderId, ...orgScope(user), status: 'OPEN' }, include: { items: { select: { id: true } } } })
    if (!order) throw new ApiError(404, 'Otwarty rachunek nie istnieje')
    const target = await tx.restaurantTable.findFirst({ where: { id: targetTableId, ...orgScope(user) }, select: { id: true } })
    if (!target) throw new ApiError(400, 'Nieprawidłowy stolik docelowy')
    if (target.id === order.tableId) return { mode: 'noop' as const, orderId }

    const targetOpen = await tx.tableOrder.findFirst({ where: { tableId: target.id, ...orgScope(user), status: 'OPEN' }, include: { items: true } })
    if (!targetOpen) {
      // Transfer — przepinamy rachunek na wolny stolik.
      await tx.tableOrder.update({ where: { id: order.id }, data: { tableId: target.id } })
      return { mode: 'transfer' as const, orderId: order.id }
    }
    // Łączenie — przenosimy wszystkie pozycje (w tym storna) do rachunku docelowego, kasujemy źródłowy.
    await tx.tableOrderItem.updateMany({ where: { orderId: order.id }, data: { orderId: targetOpen.id } })
    const all = await tx.tableOrderItem.findMany({ where: { orderId: targetOpen.id } })
    await tx.tableOrder.update({ where: { id: targetOpen.id }, data: { total: orderTotal(all) } })
    await tx.tableOrder.delete({ where: { id: order.id } })
    return { mode: 'merge' as const, orderId: targetOpen.id }
  })
  await audit(user, `order.${out.mode}`, 'TableOrder', orderId, { targetTableId, resultOrderId: out.orderId })
  return out
}

export interface CloseOpts { discount?: number; tip?: number; paymentMethod?: string; splitCount?: number; redeemPoints?: number }

// Zamknięcie rachunku → utworzenie sprzedaży (przychód) + oznaczenie CLOSED. Idempotentne.
// Przychód (Sale.total) = NETTO po rabacie, BEZ napiwku — żeby analityka/food cost były poprawne.
export async function closeOrder(user: AuthUser, orderId: string, opts: CloseOpts = {}) {
  const settings = await loadSettings(user.organizationId)
  const canDiscountFreely = hasPermission(user, PERMISSIONS.MANAGE_DISCOUNTS)
  // Wszystkie odczyty i obliczenia WEWNĄTRZ transakcji (Serializable) — koniec wyścigu
  // storno↔zamknięcie: rachunek nie zafakturuje pozycji wystornowanej współbieżnie.
  const result = await serializable(async (tx) => {
    const order = await tx.tableOrder.findFirst({
      where: { id: orderId, ...orgScope(user) },
      include: { items: true, table: { select: { name: true, zone: { select: { locationId: true } } } } },
    })
    // kelner = otwierający rachunek (fallback: zamykający)
    if (!order) throw new ApiError(404, 'Rachunek nie istnieje')
    if (order.status === 'CLOSED') return { sale: null, alreadyClosed: true, table: order.table?.name }

    const liveItems = order.items.filter((i: any) => !i.voided) // storno poza rachunkiem
    if (liveItems.length === 0) throw new ApiError(400, 'Pusty rachunek — dodaj pozycje przed zamknięciem')

    const subtotal = orderTotal(liveItems)
    let manualDiscount = Math.min(round2(opts.discount || 0), subtotal) // rabat ręczny
    // Limit rabatu kelnera (bez uprawnienia managera). Pełny comp wymaga MANAGE_DISCOUNTS.
    if (!canDiscountFreely) {
      const cap = round2(subtotal * (settings.waiterDiscountLimitPct || 0) / 100)
      if (manualDiscount > cap) throw new ApiError(403, `Rabat przekracza limit kelnera (${settings.waiterDiscountLimitPct || 0}%). Wymaga managera.`)
    }

    // Lojalność: opcjonalna wymiana punktów gościa na rabat (w obrębie transakcji).
    let guest: any = null
    let pointDiscount = 0
    let redeemedPoints = 0
    if (order.guestId && settings.loyaltyEnabled) {
      guest = await tx.guest.findFirst({ where: { id: order.guestId, ...orgScope(user) } })
      if (guest && (opts.redeemPoints || 0) > 0) {
        const red = computeRedemption(opts.redeemPoints || 0, guest.points, settings.loyaltyRedeemValue, subtotal - manualDiscount)
        pointDiscount = red.discount
        redeemedPoints = red.points
      }
    }

    const discount = Math.min(round2(manualDiscount + pointDiscount), subtotal)
    const tip = round2(opts.tip || 0)
    const netTotal = round2(subtotal - discount) // przychód brutto do analityki (bez napiwku)
    // Opłata serwisowa (osobny przychód) — naliczana od kwoty po rabacie, konfigurowalna.
    let serviceCharge = 0
    if (settings.serviceChargeEnabled && settings.serviceChargeValue > 0) {
      serviceCharge = settings.serviceChargeType === 'AMOUNT'
        ? round2(settings.serviceChargeValue)
        : round2(netTotal * settings.serviceChargeValue / 100)
    }
    const serviceChargeVat = serviceCharge > 0 ? vatFromGross(serviceCharge, settings.serviceChargeVatRate) : 0
    // Rabat rozkładamy proporcjonalnie na pozycje; brutto po rabacie na SaleItem → VAT i raport z tych samych kwot.
    const discountFactor = subtotal > 0 ? netTotal / subtotal : 1
    const adjusted = liveItems.map((i: any) => ({ ...i, adjGross: round2(i.quantity * i.unitPrice * discountFactor) }))
    const vat = totalVatGross(adjusted.map((i: any) => ({ gross: i.adjGross, vatRate: i.vatRate })))
    const splitCount = opts.splitCount && opts.splitCount > 0 ? opts.splitCount : 1
    const locationId = order.table?.zone?.locationId ?? user.locationId ?? null

    const claimed = await tx.tableOrder.updateMany({ where: { id: order.id, status: 'OPEN' }, data: { status: 'CLOSED', closedAt: new Date(), total: netTotal } })
    if (claimed.count === 0) return { sale: null, alreadyClosed: true, table: order.table?.name }

    const sale = await tx.sale.create({
      data: {
        organizationId: user.organizationId, locationId, total: netTotal, subtotal, discount, vat, tip,
        serviceCharge, serviceChargeVat,
        serverId: order.openedById ?? user.id,
        guestId: order.guestId ?? null,
        paymentMethod: opts.paymentMethod || null, splitCount, source: 'POS',
        items: { create: adjusted.map((i: any) => ({ productId: i.productId || null, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.adjGross, vatRate: i.vatRate })) },
      },
    })
    await tx.tableOrder.update({ where: { id: order.id }, data: { saleId: sale.id } })
    // Lojalność: aktualizacja salda punktów (zużyte − naliczone), wizyt i wydatków gościa.
    if (guest && settings.loyaltyEnabled) {
      const earned = earnPoints(netTotal, settings.loyaltyPointsPerCurrency)
      // Atomowy increment (odporne na ewentualny refaktor odczytu poza transakcję).
      await tx.guest.update({ where: { id: guest.id }, data: { points: { increment: earned - redeemedPoints }, visits: { increment: 1 }, totalSpent: { increment: netTotal }, lastVisitAt: new Date() } })
    }
    await tx.posConnection.upsert({
      where: { organizationId: user.organizationId },
      create: { organizationId: user.organizationId, provider: 'floor', connected: true, lastSyncAt: new Date() },
      update: { connected: true, lastSyncAt: new Date() },
    })
    return { sale, alreadyClosed: false, table: order.table?.name }
  })

  if (result.sale) await audit(user, 'order.close', 'TableOrder', orderId, { total: result.sale.total, saleId: result.sale.id, table: result.table })
  return prisma.tableOrder.findFirst({ where: { id: orderId, ...orgScope(user) }, include: { items: true } })
}
