export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { productSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const GET = handle(async (req) => {
  const user = await requireAuth()
  // ?availableOnly=1 — tylko pozycje dostępne do zamówienia (karta kelnera).
  const availableOnly = new URL(req.url).searchParams.get('availableOnly') === '1'
  const products = await prisma.product.findMany({
    where: { ...orgScope(user), isActive: true, ...(availableOnly ? { available: true } : {}) },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(products)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS)
  const data = parseBody(productSchema, await req.json())
  const product = await prisma.product.create({ data: { organizationId: user.organizationId, ...data } })
  await audit(user, 'product.create', 'Product', product.id, { name: product.name })
  return NextResponse.json(product, { status: 201 })
})
