export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope } from '@/lib/api'
import { guestSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

// Lista / wyszukiwarka gości (?q=). Dostępna obsłudze (przypięcie gościa do rachunku).
export const GET = handle(async (req) => {
  const user = await requireAuth()
  const q = (new URL(req.url).searchParams.get('q') || '').trim()
  const where: any = { ...orgScope(user) }
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }]
  const guests = await prisma.guest.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 50 })
  return NextResponse.json(guests)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const data = parseBody(guestSchema, await req.json())
  const guest = await prisma.guest.create({ data: { organizationId: user.organizationId, name: data.name, phone: data.phone, email: data.email || null, notes: data.notes } })
  await audit(user, 'guest.create', 'Guest', guest.id, { name: guest.name })
  return NextResponse.json(guest, { status: 201 })
})
