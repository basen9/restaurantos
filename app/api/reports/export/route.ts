export const dynamic = 'force-dynamic'
import { handle, requirePermission, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCsv = (headers: string[], rows: (string | number)[][]) =>
  [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')

function csvResponse(name: string, csv: string) {
  return new Response('﻿' + csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"` },
  })
}

export const GET = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || ''
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()
  const org = orgScope(user)
  const stamp = new Date().toISOString().slice(0, 10)

  if (type === 'waste') {
    const rows = await prisma.wasteReport.findMany({ where: { ...org, date: { gte: from, lte: to } }, include: { user: { select: { name: true } } }, orderBy: { date: 'desc' }, take: 10000 })
    const csv = toCsv(['Data', 'Produkt', 'Ilość', 'Jedn.', 'Powód', 'Koszt (zł)', 'Pracownik'], rows.map((r) => [r.date.toISOString().slice(0, 10), r.product, r.quantity, r.unit, r.reason, r.totalCost, r.user?.name || '']))
    return csvResponse(`straty_${stamp}.csv`, csv)
  }

  if (type === 'sales') {
    const rows = await prisma.sale.findMany({ where: { ...org, soldAt: { gte: from, lte: to } }, include: { items: { select: { name: true, quantity: true } } }, orderBy: { soldAt: 'desc' }, take: 5000 })
    const csv = toCsv(['Data', 'Kwota (zł)', 'Źródło', 'Pozycje'], rows.map((r) => [r.soldAt.toISOString().slice(0, 16).replace('T', ' '), r.total, r.source, r.items.map((i) => `${i.quantity}x ${i.name}`).join('; ')]))
    return csvResponse(`sprzedaz_${stamp}.csv`, csv)
  }

  if (type === 'inventory') {
    const rows = await prisma.inventoryItem.findMany({ where: { ...org, isActive: true }, include: { supplier: { select: { name: true } } }, orderBy: { name: 'asc' } })
    const csv = toCsv(['Pozycja', 'Kategoria', 'Stan', 'Min', 'Jedn.', 'Cena zakupu', 'Wartość', 'Dostawca'], rows.map((r) => [r.name, r.category, r.stock, r.minStock, r.unit, r.costPerUnit, Math.round(r.stock * r.costPerUnit * 100) / 100, r.supplier?.name || '']))
    return csvResponse(`magazyn_${stamp}.csv`, csv)
  }

  if (type === 'foodcost') {
    const recipes = await prisma.recipe.findMany({ where: org, include: { product: { select: { name: true, price: true } }, items: { include: { inventoryItem: { select: { costPerUnit: true } } } } } })
    const rows = recipes.map((r) => {
      const total = r.items.reduce((s, it) => s + it.quantity * (it.inventoryItem?.costPerUnit || 0), 0)
      const per = r.yield > 0 ? total / r.yield : total
      const price = r.product?.price || 0
      const fc = price > 0 ? Math.round((per / price) * 100) : ''
      const margin = price > 0 ? Math.round(((price - per) / price) * 100) : ''
      return [r.product?.name || '', Math.round(per * 100) / 100, price, fc === '' ? '' : `${fc}%`, margin === '' ? '' : `${margin}%`]
    })
    const csv = toCsv(['Produkt', 'Koszt/szt (zł)', 'Cena (zł)', 'Food cost', 'Marża'], rows)
    return csvResponse(`food_cost_${stamp}.csv`, csv)
  }

  throw new ApiError(400, 'Nieznany typ raportu. Dozwolone: waste, sales, inventory, foodcost.')
})
