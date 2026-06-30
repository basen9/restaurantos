export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// Dane bieżącej organizacji (m.in. slug do publicznego menu QR).
export const GET = handle(async () => {
  const user = await requireAuth()
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true, slug: true, plan: true } })
  return NextResponse.json(org)
})
