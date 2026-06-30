export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requireAuth, parseBody, orgScope, ApiError } from '@/lib/api'
import { guestSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

// Lista / wyszukiwarka / segmentacja gości (?q=, ?tag=, ?birthdayMonth=1, ?minVisits=).
export const GET = handle(async (req) => {
  const user = await requireAuth()
  const sp = new URL(req.url).searchParams
  const q = (sp.get('q') || '').trim()
  const tag = (sp.get('tag') || '').trim()
  const minVisits = parseInt(sp.get('minVisits') || '0', 10) || 0
  const where: any = { ...orgScope(user) }
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }]
  if (tag) where.tags = { has: tag }
  if (minVisits > 0) where.visits = { gte: minVisits }
  let guests = await prisma.guest.findMany({ where, orderBy: { updatedAt: 'desc' }, take: sp.get('all') ? 1000 : 50 })
  // Segment "urodziny w tym miesiącu" filtrujemy w JS (miesiąc z daty).
  if (sp.get('birthdayMonth') === '1') {
    const m = new Date().getMonth()
    guests = guests.filter((g) => g.birthday && new Date(g.birthday).getMonth() === m)
  }
  return NextResponse.json(guests)
})

export const POST = handle(async (req) => {
  const user = await requireAuth()
  const data = parseBody(guestSchema, await req.json())
  let guest
  try {
    guest = await prisma.guest.create({ data: {
      organizationId: user.organizationId, name: data.name, phone: data.phone,
      email: data.email ? data.email.toLowerCase() : null, notes: data.notes,
      preferences: data.preferences, allergens: data.allergens || [], tags: data.tags || [],
      birthday: data.birthday ? new Date(data.birthday as any) : null,
    } })
  } catch (e: any) {
    if (e?.code === 'P2002') throw new ApiError(409, 'Gość z tym adresem e-mail już istnieje')
    throw e
  }
  await audit(user, 'guest.create', 'Guest', guest.id, { name: guest.name })
  return NextResponse.json(guest, { status: 201 })
})
