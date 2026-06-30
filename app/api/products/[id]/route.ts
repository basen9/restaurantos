export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, orgScope, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { productUpdateSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS)
  const data = parseBody(productUpdateSchema, await req.json())
  const product = await prisma.product.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!product) throw new ApiError(404, 'Produkt nie istnieje')
  const updated = await prisma.product.update({ where: { id: params.id }, data })
  await audit(user, 'product.update', 'Product', updated.id, { available: updated.available })
  return NextResponse.json(updated)
})

export const DELETE = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS)
  const product = await prisma.product.findFirst({ where: { id: params.id, ...orgScope(user) }, select: { id: true } })
  if (!product) throw new ApiError(404, 'Produkt nie istnieje')
  await prisma.product.update({ where: { id: params.id }, data: { isActive: false } }) // soft-delete
  await audit(user, 'product.delete', 'Product', params.id)
  return NextResponse.json({ ok: true })
})
