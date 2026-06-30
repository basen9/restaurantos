export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, ApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// PUBLICZNE menu restauracji (bez logowania) — dla kodu QR przy stoliku.
// Zwraca tylko publiczne dane karty (nazwy, ceny, opisy dostępnych pozycji).
export const GET = handle(async (_req, { params }: { params: { slug: string } }) => {
  const org = await prisma.organization.findFirst({ where: { slug: params.slug, isActive: true }, select: { id: true, name: true } })
  if (!org) throw new ApiError(404, 'Nie znaleziono restauracji')
  const products = await prisma.product.findMany({
    where: { organizationId: org.id, isActive: true, available: true },
    select: { id: true, name: true, category: true, price: true, description: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
  const categories: { category: string; items: typeof products }[] = []
  for (const p of products) {
    let c = categories.find((x) => x.category === p.category)
    if (!c) { c = { category: p.category, items: [] }; categories.push(c) }
    c.items.push(p)
  }
  return NextResponse.json({ restaurant: org.name, categories })
})
