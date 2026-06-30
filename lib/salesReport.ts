// Czysta agregacja raportów sprzedaży — testowalna bez bazy.
import { vatBreakdownGross } from './tax'

export interface SaleLike {
  total: number
  tip?: number
  discount?: number
  vat?: number
  paymentMethod?: string | null
  soldAt: Date | string
  items: { name: string; quantity: number; total: number; vatRate?: number }[]
}

export function buildSalesReport(sales: SaleLike[], days: number) {
  const revenue = round2(sales.reduce((s, x) => s + x.total, 0))
  const tips = round2(sales.reduce((s, x) => s + (x.tip || 0), 0))
  const discounts = round2(sales.reduce((s, x) => s + (x.discount || 0), 0))
  const vatTotal = round2(sales.reduce((s, x) => s + (x.vat || 0), 0))
  const transactions = sales.length
  const avgTicket = transactions ? round2(revenue / transactions) : 0

  // Rozbicie VAT wg stawki (księgowość) — z kwot brutto pozycji (już po rabacie),
  // dzięki czemu uzgadnia się z sumą Sale.vat.
  const vatByRate = vatBreakdownGross(
    sales.flatMap((s) => s.items.map((i) => ({ gross: i.total, vatRate: i.vatRate ?? 8 }))),
  )

  // Bestsellery wg nazwy pozycji (ilość + przychód).
  const prodMap = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const s of sales) for (const it of s.items) {
    const e = prodMap.get(it.name) || { name: it.name, qty: 0, revenue: 0 }
    e.qty += it.quantity; e.revenue += it.total
    prodMap.set(it.name, e)
  }
  const bestSellers = Array.from(prodMap.values()).map((e) => ({ ...e, revenue: round2(e.revenue) })).sort((a, b) => b.qty - a.qty).slice(0, 10)

  // Sprzedaż wg godziny (0–23).
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0 }))
  for (const s of sales) byHour[new Date(s.soldAt).getHours()].revenue += s.total
  byHour.forEach((b) => (b.revenue = round2(b.revenue)))

  // Metody płatności.
  const payMap = new Map<string, { method: string; count: number; total: number }>()
  for (const s of sales) {
    const m = s.paymentMethod || 'NIEZNANA'
    const e = payMap.get(m) || { method: m, count: 0, total: 0 }
    e.count++; e.total += s.total
    payMap.set(m, e)
  }
  const paymentBreakdown = Array.from(payMap.values()).map((e) => ({ ...e, total: round2(e.total) })).sort((a, b) => b.total - a.total)

  return { days, revenue, tips, discounts, vatTotal, vatByRate, transactions, avgTicket, bestSellers, byHour, paymentBreakdown }
}

function round2(n: number) { return Math.round(n * 100) / 100 }
