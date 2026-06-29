export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, requirePermission, parseBody, orgScope } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { supplierSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const suppliers = await prisma.supplier.findMany({
    where: { ...orgScope(user), isActive: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(suppliers)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY)
  const data = parseBody(supplierSchema, await req.json())
  const supplier = await prisma.supplier.create({
    data: {
      organizationId: user.organizationId,
      name: data.name,
      contact: data.contact,
      email: data.email || null,
      phone: data.phone,
      notes: data.notes,
    },
  })
  return NextResponse.json(supplier, { status: 201 })
})
