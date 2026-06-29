import { NextResponse } from 'next/server'
import { handle, requireAuth, orgScope } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export const GET = handle(async () => {
  const user = await requireAuth()
  const products = await prisma.product.findMany({
    where: { ...orgScope(user), isActive: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(products)
})
