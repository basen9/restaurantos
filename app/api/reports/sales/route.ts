export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { buildSalesReport } from '@/lib/salesReport'
import { prisma } from '@/lib/prisma'

// Raport sprzedaży: bestsellery, sprzedaż wg godzin, metody płatności, napiwki, rabaty.
export const GET = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('days') || '30', 10) || 30, 1), 365)
  const from = new Date(); from.setDate(from.getDate() - days); from.setHours(0, 0, 0, 0)
  const sales = await prisma.sale.findMany({
    where: { ...orgScope(user), soldAt: { gte: from } },
    select: { total: true, tip: true, discount: true, vat: true, paymentMethod: true, soldAt: true, items: { select: { name: true, quantity: true, total: true, vatRate: true } } },
    take: 20000,
  })
  return NextResponse.json(buildSalesReport(sales, days))
})
