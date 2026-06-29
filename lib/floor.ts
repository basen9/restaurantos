// Czysta logika planu sali / zamówień — testowalna bez bazy.

export interface OrderItemLike {
  kind?: string
  quantity: number
  unitPrice: number
  status?: string
  createdAt?: Date | string
}

export const orderTotal = (items: OrderItemLike[]): number =>
  Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100

export const minutesSince = (d: Date | string, now: number): number =>
  Math.max(0, Math.floor((now - new Date(d).getTime()) / 60000))

// Najstarsza niewydana pozycja (PENDING/PREPARING/READY) w minutach — sygnał "czeka długo".
export function oldestUnservedMin(items: OrderItemLike[], now: number): number | null {
  const open = items.filter((i) => i.status !== 'SERVED' && i.createdAt)
  if (!open.length) return null
  return Math.max(...open.map((i) => minutesSince(i.createdAt!, now)))
}

// Podsumowanie stolika do widoku planu sali.
export function summarizeOrder(items: OrderItemLike[], now: number) {
  return {
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    total: orderTotal(items),
    oldestUnservedMin: oldestUnservedMin(items, now),
    pending: items.filter((i) => i.status === 'PENDING').length,
    preparing: items.filter((i) => i.status === 'PREPARING').length,
    ready: items.filter((i) => i.status === 'READY').length,
  }
}
