// Czysta logika planu sali / zamówień — testowalna bez bazy.

export interface OrderItemLike {
  kind?: string
  quantity: number
  unitPrice: number
  status?: string
  voided?: boolean
  createdAt?: Date | string
}

// Pozycje liczone do rachunku/kuchni — bez wystornowanych.
const live = (items: OrderItemLike[]) => items.filter((i) => !i.voided)

export const orderTotal = (items: OrderItemLike[]): number =>
  Math.round(live(items).reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100

export const minutesSince = (d: Date | string, now: number): number =>
  Math.max(0, Math.floor((now - new Date(d).getTime()) / 60000))

// Najstarsza niewydana pozycja (PENDING/PREPARING/READY) w minutach — sygnał "czeka długo".
export function oldestUnservedMin(items: OrderItemLike[], now: number): number | null {
  const open = live(items).filter((i) => i.status !== 'SERVED' && i.createdAt)
  if (!open.length) return null
  return Math.max(...open.map((i) => minutesSince(i.createdAt!, now)))
}

// Podsumowanie stolika do widoku planu sali (pomija wystornowane pozycje).
export function summarizeOrder(items: OrderItemLike[], now: number) {
  const l = live(items)
  return {
    itemCount: l.reduce((s, i) => s + i.quantity, 0),
    total: orderTotal(items),
    oldestUnservedMin: oldestUnservedMin(items, now),
    pending: l.filter((i) => i.status === 'PENDING').length,
    preparing: l.filter((i) => i.status === 'PREPARING').length,
    ready: l.filter((i) => i.status === 'READY').length,
  }
}
